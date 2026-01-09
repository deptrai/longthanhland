import { Test, TestingModule } from '@nestjs/testing';
import { ContractService, ContractData } from './contract.service';
import * as puppeteer from 'puppeteer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as nodemailer from 'nodemailer';

// Mock dependencies
jest.mock('puppeteer');
jest.mock('@aws-sdk/client-s3');
jest.mock('nodemailer');

describe('ContractService', () => {
    let service: ContractService;
    let mockS3Client: any;
    let mockTransporter: any;

    beforeEach(async () => {
        // Setup Mocks
        mockS3Client = {
            send: jest.fn().mockResolvedValue({}),
        };
        (S3Client as jest.Mock).mockReturnValue(mockS3Client);

        mockTransporter = {
            sendMail: jest.fn().mockResolvedValue({}),
        };
        (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

        const module: TestingModule = await Test.createTestingModule({
            providers: [ContractService],
        }).compile();

        service = module.get<ContractService>(ContractService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('generateContractHtml', () => {
        it('should generate valid HTML', () => {
            const data: ContractData = {
                orderCode: 'ORD-123',
                customerName: 'Nguyen Van A',
                customerId: 'NB-123',
                customerEmail: 'a@example.com',
                treeCount: 5,
                totalAmount: 1250000,
                treeCodes: ['ABC-1', 'ABC-2'],
                lotName: 'Lot A',
                paymentMethod: 'USDT',
                paymentDate: new Date('2024-01-01'),
                contractDate: new Date('2024-01-01'),
            };

            const html = service.generateContractHtml(data);
            expect(html).toContain('ORD-123');
            expect(html).toContain('Nguyen Van A');
            expect(html).toContain('5 cây');
        });
    });

    describe('generatePdf', () => {
        it('should call puppeteer to generate PDF', async () => {
            const mockPage = {
                setContent: jest.fn(),
                pdf: jest.fn().mockResolvedValue(Buffer.from('pdf-content')),
                close: jest.fn(),
            };
            const mockBrowser = {
                newPage: jest.fn().mockResolvedValue(mockPage),
                close: jest.fn(),
            };
            (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

            const buffer = await service.generatePdf('<html></html>');

            expect(puppeteer.launch).toHaveBeenCalled();
            expect(mockPage.setContent).toHaveBeenCalled();
            expect(mockPage.pdf).toHaveBeenCalled();
            expect(mockBrowser.close).toHaveBeenCalled();
            expect(buffer).toBeInstanceOf(Buffer);
        });

        it('should handle errors and ensure browser closes', async () => {
            const mockBrowser = {
                newPage: jest.fn().mockRejectedValue(new Error('Browser Error')),
                close: jest.fn(),
            };
            (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

            await expect(service.generatePdf('html')).rejects.toThrow('Browser Error');
            expect(mockBrowser.close).toHaveBeenCalled();
        });
    });

    describe('uploadToS3', () => {
        it('should upload file and return url', async () => {
            const filename = 'test.pdf';
            const buffer = Buffer.from('data');

            const url = await service.uploadToS3(filename, buffer);

            expect(mockS3Client.send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
            expect(url).toContain('test.pdf');
        });
    });

    describe('sendContractEmail', () => {
        it('should send email with attachment', async () => {
            process.env.EMAIL_USER = 'test'; // Enable email

            await service.sendContractEmail(
                'test@example.com',
                'Test User',
                Buffer.from('pdf'),
                'contract.pdf'
            );

            expect(mockTransporter.sendMail).toHaveBeenCalledWith(expect.objectContaining({
                to: 'test@example.com',
                attachments: expect.arrayContaining([
                    expect.objectContaining({ filename: 'contract.pdf' })
                ])
            }));
        });
    });
});
