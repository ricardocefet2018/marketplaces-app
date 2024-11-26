describe("Login", () => {
  describe("Show form properly", () => {
    it("should display login form fields properly", async () => {
      const inputs = await $$("input");
      expect(inputs.length).toEqual(4);
    });
    it("should display cancel button disabeled, since there is no logged account", async () => {
      const buttonCancel = await $("button=Cancel");
      const disabled = await buttonCancel.getProperty("disabled");
      expect(disabled).toBe(true);
    });
    it("should display save button", async () => {
      const buttonSave = await $("button=Save");
      expect(buttonSave).toBeClickable();
    });
  });

  describe("Fail", () => {
    return;
  });
});
