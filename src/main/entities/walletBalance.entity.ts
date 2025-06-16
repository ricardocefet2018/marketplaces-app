import {BaseEntity, Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn} from "typeorm";
import {User} from "./user.entity";

@Entity()
export class WalletBalance extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({type: 'float', default: 0})
    csFloatInventoryValue: number;

    @Column({type: 'float', default: 0})
    buffInventoryValue: number;

    @Column({type: 'float', default: 0})
    csFloatWalletBalance: number;

    @Column({type: 'float', default: 0})
    shadowPayWalletBalance: number;

    @Column({type: 'float', default: 0})
    marketCsgoWalletBalance: number;

    @Column({type: 'float', default: 0})
    waxpeerWalletBalance: number;

    @Column({type: 'datetime'})
    lastUpdatedAt: Date;

    @OneToOne(() => User, (user) => user.walletBalance, {
        nullable: false,
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
    })
    @JoinColumn()
    user: User;
}