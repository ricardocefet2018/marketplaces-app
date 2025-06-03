import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./user.entity";

@Entity("inventory")
export class Inventory {
    @PrimaryColumn({ type: "varchar" })
    assetid: string;

    @Column({ type: "integer" })
    appid: number;

    @Column({ type: "varchar" })
    contextid: string;

    @Column({ type: "varchar" })
    classid: string;

    @Column({ type: "varchar" })
    instanceid: string;

    @Column({ type: "integer" })
    pos: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: "user_id" })
    user: User;

    @Column({ type: "varchar", nullable: true })
    name: string;

    @Column({ type: "varchar", nullable: true })
    market_name: string;

    @Column({ type: "varchar", nullable: true })
    image_url: string;

    @Column({ type: "boolean", default: true })
    tradable: boolean;

    @Column("simple-json")
    item_data: any;

    @CreateDateColumn({ type: "datetime" })
    created_at: Date;

    @UpdateDateColumn({ type: "datetime" })
    updated_at: Date;

    constructor(data?: Partial<Inventory>) {
        if (data) {
            Object.assign(this, data);
        }
    }
}
