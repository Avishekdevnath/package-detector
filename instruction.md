Here's a complete **step-by-step plan** to build `@avishekdevnath/package-detector` as an **NPM CLI tool**, along with a **ready-to-use Cursor AI prompt** to automate development using **Cursor**.

---

## 🕵️‍♂️ Project: `@avishekdevnath/package-detector`

### 📦 Description:

A powerful CLI tool to detect:

* ❌ **Unused packages**
* ⬆️ **Outdated dependencies**
* 🧑‍🤝‍🧑 **Duplicated modules**
* 🏋️ **Heavy packages** (via Bundlephobia)

---

### 🧰 Tech Stack

| Tool                 | Purpose                                    |
| -------------------- | ------------------------------------------ |
| Node.js + TypeScript | Runtime and language                       |
| `chalk`              | Pretty CLI output                          |
| `npm-which`          | Resolve local binaries                     |
| `webpack`            | Analyze module structure                   |
| `bundlephobia API`   | Get package sizes                          |
| `child_process`      | For running `npm ls`, `npm outdated`, etc. |
| `fs`, `path`         | File system traversal                      |

---

## 📁 Suggested Project Structure

```
package-detector/
├── bin/
│   └── index.ts           # CLI Entry point
├── src/
│   ├── analyzer.ts        # Core detection logic
│   ├── heavyChecker.ts    # Bundlephobia integration
│   ├── reporter.ts        # CLI output with chalk
│   └── utils.ts
├── tests/
│   └── analyzer.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🧠 Cursor AI Prompt (Copy–Paste into Cursor)

> 🚀 Build a CLI tool using **TypeScript** named `package-detector` that does the following:
>
> 1. ✅ **Detects unused dependencies** by comparing `package.json` with actual import/require usage in `.ts` or `.js` files (static analysis).
> 2. ⬆️ **Detects outdated packages** using `npm outdated` under the hood.
> 3. 🧑‍🤝‍🧑 **Detects duplicate packages** (multiple versions of the same module) using `npm ls`.
> 4. 🏋️ **Detects heavy packages** by calling [Bundlephobia API](https://bundlephobia.com/) for size stats.
>
> 🔧 Use:
>
> * `chalk` for output styling
> * `npm-which` to resolve local project binaries
> * `webpack` or AST-based tools for module traversal (for unused check)
> * `axios` for API calls to Bundlephobia
>
> 📦 Add CLI command: `npx package-detector [--unused|--outdated|--heavy|--duplicates|--all]`
>
> 🔁 Output color-coded results in the terminal:
>
> * Red ❌ = unused
> * Yellow ⚠️ = outdated
> * Blue 💡 = duplicates
> * Magenta 🏋️ = heavy
>
> 📁 Project folder should follow clean modular structure. Also create a `README.md` with usage, install, and example output.

---

## 🏁 Steps to Implement (Manually or via Cursor)

### 1. Initialize Project

```bash
npm init -y
npm install typescript ts-node chalk npm-which axios webpack @types/node --save
npx tsc --init
```

---

### 2. Setup CLI Entry (bin/index.ts)

```ts
#!/usr/bin/env ts-node

import { detectUnused } from "../src/analyzer";
import { detectOutdated } from "../src/outdatedChecker";
import { detectHeavy } from "../src/heavyChecker";
import { detectDuplicates } from "../src/duplicateChecker";

const args = process.argv.slice(2);

if (args.includes("--unused")) detectUnused();
else if (args.includes("--outdated")) detectOutdated();
else if (args.includes("--heavy")) detectHeavy();
else if (args.includes("--duplicates")) detectDuplicates();
else {
  detectUnused();
  detectOutdated();
  detectHeavy();
  detectDuplicates();
}
```

Update `package.json`:

```json
"bin": {
  "package-detector": "./bin/index.ts"
}
```

---

### 3. Heavy Checker (src/heavyChecker.ts)

```ts
import axios from "axios";
import chalk from "chalk";
import { readFileSync } from "fs";

export async function detectHeavy() {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const deps = Object.keys(pkg.dependencies || {});
  for (const dep of deps) {
    const url = `https://bundlephobia.com/api/size?package=${dep}`;
    try {
      const res = await axios.get(url);
      const size = res.data.size;
      if (size > 100 * 1024) {
        console.log(chalk.magenta(`🏋️ ${dep} - ${Math.round(size/1024)}KB`));
      }
    } catch {
      console.log(chalk.gray(`⚠️ Skipped ${dep}`));
    }
  }
}
```

---

### 4. Add `detectUnused()`, `detectOutdated()`, and `detectDuplicates()` similarly.

If needed, I can generate these for you too.

---

### 5. Testing

```bash
npm link    # Run locally
npx package-detector --all
```

---

### 6. Publish to NPM

```bash
npm login
npm publish --access public
```

---

## ✅ Extras to Add

* `README.md` with sample output
* `tests/` with Jest or Vitest
* Cache Bundlephobia responses to avoid rate limits

---

Would you like:

* Auto-generated `README.md`?
* Sample project to test this tool on?
* Help building `detectUnused()` logic with AST parsing?

Let me know!
