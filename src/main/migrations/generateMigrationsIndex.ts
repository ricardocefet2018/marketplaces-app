import fsp from "node:fs/promises";
import { join } from "node:path";
import { format } from "prettier";

(async () => {
  const fileNames = await fsp.readdir(__dirname);
  const indexContentLines = [];
  const classNames = [];
  for (const fileName of fileNames) {
    if (!/^[0-9]/.test(fileName)) {
      console.log(fileName);
      continue;
    }
    const fileContent = await fsp.readFile(join(__dirname, fileName), "utf-8");
    const className = fileContent.split("class ")[1].split(" implements")[0];
    classNames.push(className);
    indexContentLines.push(
      `import {${className}} from "./${fileName.replace(".ts", "")}";`
    );
  }
  indexContentLines.push(`const entities = [${classNames.join(", ")}];`);
  indexContentLines.push("export default entities;");
  const indexContent = await format(indexContentLines.join("\n"), {
    parser: "typescript",
  });
  await fsp.writeFile(
    join(__dirname, "migrations.index.ts"),
    indexContent,
    "utf-8"
  );
})();
