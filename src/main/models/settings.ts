import { ISettings } from "../../shared/types";
import { BaseEntity, Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class Settings extends BaseEntity implements ISettings {
  @PrimaryColumn({
    type: "int",
    nullable: false,
    unique: true,
  })
  id = 1;

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
