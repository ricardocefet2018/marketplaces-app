import {BaseEntity, Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn} from "typeorm";
import {User} from "./user.entity";

@Entity()
export class ListItems extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({type: 'int'})
    itemsExchangeable: number;

    @Column({type: 'datetime'})
    lastUpdatedAt: Date;

    @OneToOne(() => User, (user) => user.listItems, {
        nullable: false,
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
    })
    @JoinColumn()
    user: User;
}
