import path from "path";

module.exports = {
  "*.{ts,tsx,js,jsx}": (filenames) => {
    const commands = [`prettier --write ${filenames.join(" ")}`];
    
    filenames.forEach((file) => {
      const fileDir = path.dirname(file);
      commands.push(`cd "${fileDir}" && eslint --fix "${file}" || true`);
    });
    
    return commands;
  },
  "*.{md,json,css}": ["prettier --write"],
  "*.py": ["black", "ruff check --fix"],
};
