import { TradeWebsocketEvents } from "../../models/types";
import { EventEmitter } from "node:events";
import CSFloatClient from "./csfloatClient";
import { CSFloatTradeOfferPayload } from "./interface/csfloat.interface";

interface CSFloatSocketEvents extends TradeWebsocketEvents {
  sendTrade: (data: CSFloatTradeOfferPayload) => void;
  cancelTrade: (tradeOfferId: string) => void;
  acceptWithdraw: (tradeOfferId: string) => void;
  stateChange: (online: boolean) => void;
  error: (error: any) => void;
}

export declare interface CSFloatSocket {
  emit<U extends keyof CSFloatSocketEvents>(
    event: U,
    ...args: Parameters<CSFloatSocketEvents[U]>
  ): boolean;

  on<U extends keyof CSFloatSocketEvents>(
    event: U,
    listener: CSFloatSocketEvents[U]
  ): this;

  once<U extends keyof CSFloatSocketEvents>(
    event: U,
    listener: CSFloatSocketEvents[U]
  ): this;
}

export class CSFloatSocket extends EventEmitter {
  private csfloatClient: CSFloatClient;
  private connected: boolean;

  public constructor(csfloatClient: CSFloatClient) {
    super();
    this.csfloatClient = csfloatClient;
    this.connect();
  }

  public async connect(): Promise<void> {
    this.connected = true;
    await this.loop();
  }

  private async loop() {
    let count = 1;
    while (this.connected) {
      count++;
      await this.main(); // Espera a execução da função main terminar
      await new Promise((resolve) => setTimeout(resolve, 1000 * 60)); // Aguarda 1 minuto antes da próxima iteração
    }
  }

  async main() {
    //Parte 1: Atualização de último ping
    // const lastPing = Date.now();

    //Parte 2: Verificação de permissões
    const hasPermission = await this.csfloatClient.verifySteamPermission();

    if (!hasPermission) {
      this.emit("stateChange", false);
      return;
    }

    //Parte 3: Busca de trocas pendentes
    const tradesToSend = await this.csfloatClient.getTradesInPending();

    //Parte 4: Obtenção do token de acesso
    // const steamToken = await this.csfloatClient.getSteamToken();

    //Parte 5: Atualização de trocas pendentes
    if (tradesToSend.length < 0) return;
    await this.csfloatClient.pingUpdates(tradesToSend);

    //Parte 6: Ping do status da extensão
    await this.csfloatClient.pingExtensionStatus({
      history_error: "",
      trade_offer_error: "",
    });
    return;
  }

  public disconnect() {
    this.connected = false;
    return;
  }
}
