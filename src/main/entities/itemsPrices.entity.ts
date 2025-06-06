import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from "typeorm";

@Entity()
export class ItemsPrices extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({type: "text", nullable: false})
    marketHashName: string;

    @Column({type: "float", nullable: true})
    priceCSFloat: number | null;

    @Column({type: "float", nullable: true})
    priceBuff163: number | null;

    @Column({type: "datetime", nullable: false})
    lastUpdatedAtCSFloat: Date

    @Column({type: "datetime", nullable: false})
    lastUpdatedAtBuff163: Date
}
