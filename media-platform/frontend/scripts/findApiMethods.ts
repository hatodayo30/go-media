const fs = require("fs");
const path = require("path");

const targetFolders = ["src/pages", "src/components"];
const apiMethods: Set<string> = new Set();

interface MethodCount {
  [key: string]: number;
}

function searchApiMethods(dir: string): void {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        searchApiMethods(filePath);
      } else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
        try {
          const content = fs.readFileSync(filePath, "utf-8");

          // APIメソッドの抽出パターンを改良
          const patterns = [
            /api\.(\w+)\s*\(/g, // api.method() の形式
            /await\s+api\.(\w+)/g, // await api.method の形式
            /\bapi\.(\w+)\b/g, // api.method の形式（単語境界付き）
          ];

          patterns.forEach((pattern) => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
              apiMethods.add(`api.${match[1]}`);
            }
          });
        } catch (error) {
          console.warn(
            `Error reading file ${filePath}:`,
            (error as Error).message
          );
        }
      }
    }
  } catch (error) {
    console.warn(`Error reading directory ${dir}:`, (error as Error).message);
  }
}

// メイン実行
console.log("🔍 Searching for API method usage...\n");

targetFolders.forEach((folder) => {
  const fullPath = path.join(__dirname, "../", folder);

  console.log(`📁 Searching in: ${fullPath}`);

  if (fs.existsSync(fullPath)) {
    searchApiMethods(fullPath);
  } else {
    console.warn(`❌ Directory not found: ${fullPath}`);
  }
});

console.log("\n" + "=".repeat(50));
console.log("📋 API METHODS FOUND");
console.log("=".repeat(50));

const sortedMethods = [...apiMethods].sort();
sortedMethods.forEach((method, index) => {
  console.log(`${(index + 1).toString().padStart(2)}: ${method}`);
});

console.log(`\n📊 Total: ${apiMethods.size} unique API methods`);

// 使用頻度の分析
console.log("\n" + "=".repeat(50));
console.log("📈 USAGE FREQUENCY ANALYSIS");
console.log("=".repeat(50));

const methodCounts: MethodCount = {};

function countMethodUsage(dir: string): void {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        countMethodUsage(filePath);
      } else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
        try {
          const content = fs.readFileSync(filePath, "utf-8");

          apiMethods.forEach((method) => {
            const methodName = method.replace("api.", "");
            const regex = new RegExp(`api\\.${methodName}\\b`, "g");
            const matches = content.match(regex);
            if (matches) {
              methodCounts[method] =
                (methodCounts[method] || 0) + matches.length;
            }
          });
        } catch (error) {
          console.warn(
            `Error reading file ${filePath}:`,
            (error as Error).message
          );
        }
      }
    }
  } catch (error) {
    console.warn(`Error reading directory ${dir}:`, (error as Error).message);
  }
}

targetFolders.forEach((folder) => {
  const fullPath = path.join(__dirname, "../", folder);
  if (fs.existsSync(fullPath)) {
    countMethodUsage(fullPath);
  }
});

const sortedByUsage = Object.entries(methodCounts).sort(
  ([, a], [, b]) => (b as number) - (a as number)
);

sortedByUsage.forEach(([method, count], index) => {
  const emoji = index < 3 ? "🔥" : index < 10 ? "⭐" : "📝";
  console.log(`${emoji} ${method.padEnd(25)}: ${count} times`);
});

// API定義との比較
console.log("\n" + "=".repeat(50));
console.log("🔍 CHECKING AGAINST API DEFINITIONS");
console.log("=".repeat(50));

const apiFilePath = path.join(__dirname, "../src/services/api.ts");
if (fs.existsSync(apiFilePath)) {
  try {
    const apiContent = fs.readFileSync(apiFilePath, "utf-8");
    const definedMethods: Set<string> = new Set();

    // api.ts内で定義されているメソッドを抽出
    const methodDefPatterns = [
      /(\w+):\s*async/g, // method: async の形式
      /async\s+(\w+)\s*\(/g, // async method( の形式
      /(\w+)\s*:\s*\(.*?\)\s*=>/g, // method: (...) => の形式
    ];

    methodDefPatterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(apiContent)) !== null) {
        definedMethods.add(`api.${match[1]}`);
      }
    });

    console.log(`📚 Defined API methods: ${definedMethods.size}`);
    console.log(`🎯 Used API methods: ${apiMethods.size}`);

    const unusedMethods = [...definedMethods].filter(
      (method) => !apiMethods.has(method)
    );
    const undefinedMethods = [...apiMethods].filter(
      (method) => !definedMethods.has(method)
    );

    if (unusedMethods.length > 0) {
      console.log("\n🚫 Potentially unused methods:");
      unusedMethods.forEach((method) => console.log(`   ${method}`));
    }

    if (undefinedMethods.length > 0) {
      console.log("\n⚠️  Methods used but not found in definitions:");
      undefinedMethods.forEach((method) => console.log(`   ${method}`));
    }

    if (unusedMethods.length === 0 && undefinedMethods.length === 0) {
      console.log(
        "\n✅ Perfect match! All defined methods are used and all used methods are defined."
      );
    }
  } catch (error) {
    console.warn(`❌ Error reading API file:`, (error as Error).message);
  }
} else {
  console.warn("❌ API file not found at expected location");
}

// サマリーレポート
console.log("\n" + "=".repeat(50));
console.log("📊 SUMMARY REPORT");
console.log("=".repeat(50));

const totalFiles = countFiles();
const mostUsedMethod = sortedByUsage[0];
const leastUsedMethod = sortedByUsage[sortedByUsage.length - 1];

console.log(`📁 Files scanned: ${totalFiles}`);
console.log(`🎯 API methods found: ${apiMethods.size}`);
if (mostUsedMethod) {
  console.log(
    `🏆 Most used method: ${mostUsedMethod[0]} (${mostUsedMethod[1]} times)`
  );
}
if (leastUsedMethod && leastUsedMethod[1] === 1) {
  const onceUsedMethods = sortedByUsage.filter(
    ([, count]) => count === 1
  ).length;
  console.log(`📝 Methods used only once: ${onceUsedMethods}`);
}

function countFiles(): number {
  let count = 0;

  function countInDir(dir: string): void {
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          countInDir(filePath);
        } else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
          count++;
        }
      }
    } catch (error) {
      // Silent error handling for file counting
    }
  }

  targetFolders.forEach((folder) => {
    const fullPath = path.join(__dirname, "../", folder);
    if (fs.existsSync(fullPath)) {
      countInDir(fullPath);
    }
  });

  return count;
}

console.log("\n✨ Analysis complete!");

// npx tsc scripts/findApiMethods.ts --target es2018 --module commonjs
// node scripts/findApiMethods.js
