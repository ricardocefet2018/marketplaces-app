import { Entity, PrimaryGeneratedColumn, BaseEntity, Column, BeforeInsert, BeforeUpdate } from "typeorm";

@Entity()
export class ItemsPrices extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        type: "text",
        default: "",
    })
    market_hash_name: string;

    @Column({ type: "float", default: 0 })
    csfloatPrice: number;

    @Column({ type: "float", default: 0 })
    buff163Price: number;
}