import { Field, ObjectType, ID, registerEnumType } from '@nestjs/graphql';

export enum ReferralStatus {
    PENDING = 'PENDING',
    CONVERTED = 'CONVERTED',
    PAID = 'PAID',
}

registerEnumType(ReferralStatus, {
    name: 'ReferralStatus',
    description: 'Status of a referral',
});

@ObjectType('Referral')
export class ReferralObject {
    @Field(() => ID)
    id: string;

    @Field()
    referralCode: string;

    @Field(() => ID)
    referrerId: string;

    @Field(() => ID, { nullable: true })
    refereeId?: string;

    @Field(() => ReferralStatus)
    status: ReferralStatus;

    @Field({ nullable: true })
    commission?: number;

    @Field(() => ID, { nullable: true })
    orderId?: string;

    @Field()
    createdAt: Date;

    @Field()
    updatedAt: Date;
}
