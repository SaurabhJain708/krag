const path = require("path");

module.exports = {
  "*.{ts,tsx,js,jsx}": (filenames) => {
    // Quote all filenames to handle spaces
    const quotedFiles = filenames.map((f) => `"${f}"`).join(" ");
    
    // Filter out root-level config files that don't have ESLint configs
    const filesToLint = filenames.filter((file) => {
      const basename = path.basename(file);
      // Skip lint-staged config and other root-level config files
      if (basename === ".lintstagedrc.js" || basename === "next.config.ts" || basename === "next.config.js") {
        return false;
      }
      return true;
    });
    
    // Group files by their ESLint config location and generate commands
    const filesByConfig = {};
    filesToLint.forEach((file) => {
      const normalizedPath = path.normalize(file);
      let configPath = null;
      
      if (normalizedPath.includes(path.join("apps", "web"))) {
        configPath = "apps/web/eslint.config.js";
      } else if (normalizedPath.includes(path.join("packages", "ui"))) {
        configPath = "packages/ui/eslint.config.mjs";
      }
      
      if (configPath) {
        if (!filesByConfig[configPath]) {
          filesByConfig[configPath] = [];
        }
        filesByConfig[configPath].push(file);
      }
    });
    
    // Generate ESLint commands with explicit config paths (batch files by config)
    const eslintCommands = Object.entries(filesByConfig).map(([configPath, files]) => {
      const quotedFiles = files.map((f) => `"${f}"`).join(" ");
      return `eslint --config "${configPath}" ${quotedFiles}`;
    });
    
    return [
      `prettier --write ${quotedFiles}`,
      ...eslintCommands,
    ];
  },
  "*.{md,json,css}": ["prettier --write"],
  "*.py": [
    (filenames) => {
      const files = filenames.map((f) => `"${f}"`).join(" ");
      return `uv run black ${files}`;
    },
    (filenames) => {
      const files = filenames.map((f) => `"${f}"`).join(" ");
      return `uv run ruff check --fix ${files}`;
    },
  ],
};
