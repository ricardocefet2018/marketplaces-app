import fsp from "node:fs/promises";
import { join } from "node:path";
import { format } from "prettier";

export default (async () => {
  const entitiesDir = join(__dirname, "..", "src", "main", "entities");
  const fileNames = await fsp.readdir(entitiesDir);
  const indexContentLines = [];
  const classNames = [];
  for (const fileName of fileNames) {
    if (fileName == "entities.index.ts") continue;

    const fileContent = await fsp.readFile(
      join(entitiesDir, fileName),
      "utf-8"
    );
    const className = fileContent.split("class ")[1].split(" extends")[0];
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
    join(entitiesDir, "entities.index.ts"),
    indexContent,
    "utf-8"
  );
})();
