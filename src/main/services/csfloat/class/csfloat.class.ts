import { UserResponse } from "../interface/csfloat.interface";

export class CSFloatUser {
  public steamid: string;

  public constructor(user: UserResponse["user"]) {
    this.steamid = user.id64;
  }
}
