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
        it('should send email with attachment and return success', async () => {
            process.env.EMAIL_USER = 'test'; // Enable email
            mockTransporter.sendMail.mockResolvedValue({ messageId: 'msg-123' });

            const result = await service.sendContractEmail(
                'test@example.com',
                'Test User',
                Buffer.from('pdf'),
                'contract.pdf',
                'https://s3.example.com/contract.pdf'
            );

            expect(result.success).toBe(true);
            expect(result.messageId).toBe('msg-123');
            expect(mockTransporter.sendMail).toHaveBeenCalledWith(expect.objectContaining({
                to: 'test@example.com',
                html: expect.stringContaining('Tải hợp đồng PDF tại đây'),
                attachments: expect.arrayContaining([
                    expect.objectContaining({ filename: 'contract.pdf' })
                ])
            }));
        });

        it('should return error when EMAIL_USER not configured', async () => {
            delete process.env.EMAIL_USER;

            const result = await service.sendContractEmail(
                'test@example.com',
                'Test User',
                Buffer.from('pdf'),
                'contract.pdf'
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('EMAIL_USER not configured');
        });

        it('should handle email send failure', async () => {
            process.env.EMAIL_USER = 'test';
            mockTransporter.sendMail.mockRejectedValue(new Error('SMTP Error'));

            const result = await service.sendContractEmail(
                'test@example.com',
                'Test User',
                Buffer.from('pdf'),
                'contract.pdf'
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('SMTP Error');
        });
    });

    describe('validateContractData', () => {
        it('should return empty array for valid data', () => {
            const validData = {
                orderCode: 'ORD-123',
                customerName: 'Nguyen Van A',
                customerId: 'NB-123',
                customerEmail: 'a@example.com',
                treeCount: 5,
                treeCodes: ['ABC-1'],
                lotName: 'Lot A',
            };

            const errors = service.validateContractData(validData);
            expect(errors).toHaveLength(0);
        });

        it('should return errors for missing required fields', () => {
            const invalidData = {
                orderCode: '',
                treeCount: 0,
            };

            const errors = service.validateContractData(invalidData);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors).toContain('Thiếu mã đơn hàng');
            expect(errors).toContain('Thiếu tên khách hàng');
        });
    });

    describe('generateAndSendContract', () => {
        it('should orchestrate full contract flow', async () => {
            process.env.EMAIL_USER = 'test';

            // Mock puppeteer
            const mockPage = {
                setContent: jest.fn(),
                pdf: jest.fn().mockResolvedValue(Buffer.from('pdf-content')),
            };
            const mockBrowser = {
                newPage: jest.fn().mockResolvedValue(mockPage),
                close: jest.fn(),
            };
            (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);
            mockTransporter.sendMail.mockResolvedValue({ messageId: 'msg-456' });

            const data = {
                orderCode: 'ORD-123',
                customerName: 'Nguyen Van A',
                customerId: 'NB-123',
                customerEmail: 'a@example.com',
                treeCount: 5,
                totalAmount: 1250000,
                treeCodes: ['ABC-1', 'ABC-2'],
                lotName: 'Lot A',
                paymentMethod: 'USDT' as const,
                paymentDate: new Date('2024-01-01'),
                contractDate: new Date('2024-01-01'),
            };

            const result = await service.generateAndSendContract(data);

            expect(result.success).toBe(true);
            expect(result.s3Url).toContain('contracts/');
            expect(result.emailDelivery?.success).toBe(true);
        });

        it('should return validation errors for invalid data', async () => {
            const result = await service.generateAndSendContract({} as any);

            expect(result.success).toBe(false);
            expect(result.errors).toBeDefined();
            expect(result.errors!.length).toBeGreaterThan(0);
        });
    });
});

