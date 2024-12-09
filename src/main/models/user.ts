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
    this.userSettings = new UserSettings();
  }

  public static async findOneByUsername(username: string): Promise<User> {
    const user = await this.findOneBy({
      username,
    });
    if (!user.userSettings) {
      user.userSettings = new UserSettings();
      await user.save();
    }
    if (!user.waxpeerSettings) {
      user.waxpeerSettings = new WaxpeerSettings();
      await user.save();
    }
    if (!user.shadowpaySettings) {
      user.shadowpaySettings = new ShadowpaySettings();
      await user.save();
    }
    return user;
  }
}
