import "dotenv/config";
import { browser } from "wdio-electron-service";
import { Key } from "webdriverio";
import { ask } from "../../src/shared/helpers";

async function clearElement(element: WebdriverIO.Element) {
  // TODO aparentemente existe um bug no webdriver onde ele não limpa certos campos (https://github.com/webdriverio/webdriverio/issues/1140#issuecomment-301532531)
  // por isso, esse artifício técnico foi utilizado.
  const elementLen = await element.getValue();
  for (let i = 0; i < elementLen.length; i++) {
    await element.setValue(Key.Backspace);
  }
  return;
}

describe("Todos os fluxos", () => {
  describe("Login", () => {
    before(async () => {
      expect(process.env["steamPassword"]).not.toBe(undefined);
      expect(process.env["steamUsername"]).not.toBe(undefined);
    });

    let inputSteamUsername: WebdriverIO.Element;
    let inputSteamPassword: WebdriverIO.Element;
    let inputSteamGuardCode: WebdriverIO.Element;
    let inputProxy: WebdriverIO.Element;
    let saveButton: WebdriverIO.Element;
    let cancelButton: WebdriverIO.Element;

    beforeEach(async () => {
      inputSteamUsername = await $("#steamUsername");
      inputSteamPassword = await $("#steamPassword input");
      inputSteamGuardCode = await $("#steamGuardCode");
      inputProxy = await $("#proxy");
      saveButton = await $("button=Save");
      cancelButton = await $("button=Cancel");
    });

    it("should display login form properly", async () => {
      const inputs = await $$("input");
      expect(inputs.length).toEqual(4);
      await expect(inputSteamUsername).toBeDisplayed();
      await expect(inputSteamPassword).toBeDisplayed();
      await expect(inputSteamGuardCode).toBeDisplayed();
      await expect(inputProxy).toBeDisplayed();
    });

    it("should display cancel button disabled, since there is no logged account", async () => {
      await expect(cancelButton).toBeDisplayed();
      const disabled = await cancelButton.getProperty("disabled");
      expect(disabled).toBe(true);
    });

    it("should display clickable save button", async () => {
      await expect(saveButton).toBeDisplayed();
      expect(saveButton).toBeClickable();
    });

    it("should make required inputs invalid by submitting empty form", async () => {
      await saveButton.click();
      const inputSteamUsernameClasses = await inputSteamUsername.getAttribute(
        "class"
      );
      const inputSteamPasswordClasses = await inputSteamPassword.getAttribute(
        "class"
      );
      const inputSteamGuardCodeClasses = await inputSteamGuardCode.getAttribute(
        "class"
      );
      expect(inputSteamUsernameClasses).toHaveText("invalid");
      expect(inputSteamPasswordClasses).toHaveText("invalid");
      expect(inputSteamGuardCodeClasses).toHaveText("invalid");
    });

    it("should turn form valid filling it", async () => {
      await inputSteamUsername.addValue("aaa");
      await inputSteamPassword.addValue("aaa");
      await inputSteamGuardCode.addValue("aaa");
      const isInputSteamUsernameInvalid = (
        await inputSteamUsername.getAttribute("class")
      ).includes("invalid");
      const isInputSteamPasswordInvalid = (
        await inputSteamPassword.getAttribute("class")
      ).includes("invalid");
      const isInputSteamGuardInvalid = (
        await inputSteamGuardCode.getAttribute("class")
      ).includes("invalid");
      expect(isInputSteamUsernameInvalid).toBe(false);
      expect(isInputSteamPasswordInvalid).toBe(false);
      expect(isInputSteamGuardInvalid).toBe(false);
    });

    it("should submit form with wrong data, disabling form fields and buttons while it's processing data and enabling all again after login fails", async () => {
      const inputs = await $$("input");
      await saveButton.click();
      for (const input of inputs) expect(input).toBeDisabled();
      expect(saveButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
      await saveButton.waitForEnabled({ timeout: 15000 });
      for (const input of inputs) expect(input).toBeEnabled();
      expect(saveButton).toBeEnabled();
      expect(cancelButton).toBeEnabled();
    });

    it("should fail doing login with correct data but wrong 2FA Code", async () => {
      const steamUsername = process.env["steamUsername"];
      const steamPassword = process.env["steamPassword"];
      await inputSteamUsername.setValue(steamUsername);
      await clearElement(inputSteamPassword);
      await inputSteamPassword.setValue(steamPassword);
      await inputSteamGuardCode.setValue("AAAAA");
      await saveButton.click();
      const formElem = [...(await $$("input")), ...(await $$("button"))];
      for (const elem of formElem) expect(elem).toBeDisabled();
      await saveButton.waitForEnabled({ timeout: 15000 });
      for (const elem of formElem) expect(elem).toBeEnabled();
    });

    it("should make login successfully", async () => {
      const steamUsername = process.env["steamUsername"];
      const steamPassword = process.env["steamPassword"];
      await inputSteamUsername.setValue(steamUsername);

      await clearElement(inputSteamPassword);
      await inputSteamPassword.setValue(steamPassword);

      const code = await ask(`${steamUsername}'s steam 2FA code: `);
      await inputSteamGuardCode.setValue(code);
      await saveButton.click();
      const formElem = [...(await $$("input")), ...(await $$("button"))];
      for (const elem of formElem) expect(elem).toBeDisabled();
      await inputSteamUsername.waitForExist({ timeout: 15000, reverse: true });
      for (const elem of formElem) expect(elem).not.toExist();
    });
  });

  // describe("Main", () => {
  //   let selectedAccountName: WebdriverIO.Element;

  //   beforeEach(async () => {
  //     selectedAccountName = await $(".p-card .p-card-title p");
  //   });

  //   it('should display main page properly', async () => {
  //     await expect($('p-card'))
  //   });
  // });
});
