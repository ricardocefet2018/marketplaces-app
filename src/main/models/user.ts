import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { WaxpeerSettings } from "./waxpeerSettings";
import { UserSettings } from "./userSettings";
import { ShadowpaySettings } from "./shadowpaySettings";
import { MarketcsgoSettings } from "./marketcsgoSettings";

@Entity()
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, type: "text" })
  username: string;

  @Column("text")
  refreshToken: string;

  @Column({ nullable: true, type: "text" })
  proxy?: string;

  @CreateDateColumn()
  createDate: Date;

  @UpdateDateColumn()
  updateDate: Date;

  @OneToOne(() => WaxpeerSettings, (waxpeerSettings) => waxpeerSettings.user, {
    cascade: true,
    eager: true,
    nullable: false,
  })
  waxpeerSettings: WaxpeerSettings;

  @OneToOne(
    () => ShadowpaySettings,
    (shadowpaySettings) => shadowpaySettings.user,
    {
      cascade: true,
      eager: true,
      nullable: false,
    }
  )
  shadowpaySettings: ShadowpaySettings;

  @OneToOne(
    () => MarketcsgoSettings,
    (marketcsgoSettings) => marketcsgoSettings.user,
    {
      cascade: true,
      eager: true,
      nullable: false,
    }
  )
  marketcsgoSettings: MarketcsgoSettings;

  @OneToOne(() => UserSettings, (userSettings) => userSettings.user, {
    cascade: true,
    eager: true,
    nullable: false,
  })
  userSettings: UserSettings;

  public constructor(username?: string, proxy?: string) {
    super();
    this.username = username;
    this.proxy = proxy;
    this.waxpeerSettings = new WaxpeerSettings();
    this.shadowpaySettings = new ShadowpaySettings();
    this.marketcsgoSettings = new MarketcsgoSettings();
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
    if (!user.waxpeerSettings) {
      user.waxpeerSettings = new WaxpeerSettings();
      updated = true;
    }
    if (!user.shadowpaySettings) {
      user.shadowpaySettings = new ShadowpaySettings();
      updated = true;
    }
    if (!user.marketcsgoSettings) {
      user.marketcsgoSettings = new MarketcsgoSettings();
      updated = true;
    }
    if (updated) await user.save();
    return user;
  }
}
