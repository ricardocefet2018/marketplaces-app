import { ISettings } from "../../shared/types";
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Settings extends BaseEntity implements ISettings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: "boolean",
    nullable: false,
    default: false,
  })
  startWithWindow: boolean;

  @Column({
    type: "boolean",
    nullable: false,
    default: true,
  })
  notification: boolean;
}
