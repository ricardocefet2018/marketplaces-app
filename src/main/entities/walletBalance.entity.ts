import { BaseEntity, Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";

@Entity()
export class WalletBalance extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'float', default: 0 })
    inventoryBalanceFloat: number;

    @Column({ type: 'float', default: 0 })
    inventoryBalanceBuff: number;

    @Column({ type: 'float', default: 0 })
    csfloatBalance: number;

    @Column({ type: 'float', default: 0 })
    shadowpayBalance: number;

    @Column({ type: 'float', default: 0 })
    marketcsgoBalance: number;

    @Column({ type: 'float', default: 0 })
    waxpeerBalance: number;

    @Column({ type: 'float', default: 0 })
    totalBalance: number;

    @Column({ type: 'datetime' })
    lastUpdate: Date;

    @OneToOne(() => User, (user) => user.walletBalance, {
        nullable: false,
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
    })
    @JoinColumn()
    user: User;
}