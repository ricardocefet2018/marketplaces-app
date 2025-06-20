import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationOptions,
  UpdateDateColumn,
} from "typeorm";
import { Shadowpay } from "./shadowpay.entity";
import { MarketCSGO } from "./marketcsgo.entity";
import { CSFloat } from "./csfloat.entity";
import { UserSettings } from "./userSettings";
import { Waxpeer } from "./waxpeer.entity";
import { Inventory } from "./inventory.entity";

const baseRelationOptions: RelationOptions = {
  cascade: true,
  eager: true,
  nullable: false,
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
};

@Entity()
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, type: "text" })
  username: string;

  @Column("text")
  refreshToken: string;

  @Column({ nullable: true, type: "text" })
  avatarUrl: string;

  @Column({ nullable: true, type: "text" })
  proxy?: string;

  @CreateDateColumn()
  createDate: Date;

  @UpdateDateColumn()
  updateDate: Date;

  @OneToOne(() => Waxpeer, (waxpeer) => waxpeer.user, baseRelationOptions)
  waxpeer: Waxpeer;

  @OneToOne(() => Shadowpay, (shadowpay) => shadowpay.user, baseRelationOptions)
  shadowpay: Shadowpay;

  @OneToOne(
    () => MarketCSGO,
    (marketcsgo) => marketcsgo.user,
    baseRelationOptions
  )
  marketcsgo: MarketCSGO;

  @OneToOne(() => CSFloat, (csfloat) => csfloat.user, baseRelationOptions)
  csfloat: CSFloat;

  @OneToOne(
    () => UserSettings,
    (userSettings) => userSettings.user,
    baseRelationOptions
  )
  userSettings: UserSettings;

  @OneToMany(() => Inventory, (inventory) => inventory.user, { eager: true })
  inventory: Inventory[];

  public constructor(username?: string, proxy?: string) {
    super();
    this.username = username;
    this.proxy = proxy;
    this.waxpeer = new Waxpeer();
    this.shadowpay = new Shadowpay();
    this.marketcsgo = new MarketCSGO();
    this.csfloat = new CSFloat();
    this.userSettings = new UserSettings();
  }

  public static async findOneByUsername(username: string): Promise<User> {
    const user = await this.findOneBy({
      username,
    });
    let updated = false;
    if (!user.userSettings) {
      user.userSettings = new UserSettings();
      updated = true;
    }
    if (!user.waxpeer) {
      user.waxpeer = new Waxpeer();
      updated = true;
    }
    if (!user.shadowpay) {
      user.shadowpay = new Shadowpay();
      updated = true;
    }
    if (!user.marketcsgo) {
      user.marketcsgo = new MarketCSGO();
      updated = true;
    }
    if (!user.csfloat) {
      user.csfloat = new CSFloat();
      updated = true;
    }
    if (!user.inventory) {
      user.inventory = [];
      updated = true;
    }
    if (updated) await user.save();
    return user;
  }
}
