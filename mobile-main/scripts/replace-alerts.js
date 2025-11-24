#!/usr/bin/env node

/**
 * Script to replace Alert.alert with CustomAlert.alert throughout the app
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get list of files with Alert.alert
const filesOutput = execSync(
  'grep -r "Alert.alert" src/ --include="*.jsx" --include="*.js" -l',
  { encoding: 'utf-8', cwd: path.join(__dirname, '..') }
);

const files = filesOutput
  .trim()
  .split('\n')
  .filter(f => f && !f.includes('CustomAlert.jsx')); // Exclude the CustomAlert file itself

console.log(`Found ${files.length} files with Alert.alert`);

let totalReplacements = 0;

files.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;

  // Check if file already imports CustomAlert
  const hasCustomAlertImport = content.includes('CustomAlert');

  // Replace Alert.alert with CustomAlert.alert
  content = content.replace(/Alert\.alert/g, 'CustomAlert.alert');

  // Update imports if needed
  if (!hasCustomAlertImport && content.includes('CustomAlert.alert')) {
    // Check if it imports from 'react-native'
    const rnImportRegex = /import\s+{([^}]+)}\s+from\s+['"]react-native['"]/;
    const match = content.match(rnImportRegex);

    if (match) {
      const imports = match[1].split(',').map(i => i.trim());

      // Remove Alert from react-native imports if present
      const filteredImports = imports.filter(i => i !== 'Alert');

      // Determine path to CustomAlert based on file location
      const depth = file.split('/').length - 2; // -2 because we start from src/
      const relativePath = '../'.repeat(depth) + 'components/CustomAlert';

      if (filteredImports.length > 0) {
        // Replace the react-native import
        const newImport = `import { ${filteredImports.join(', ')} } from 'react-native'`;
        content = content.replace(rnImportRegex, newImport);
      } else {
        // Remove the entire react-native import if Alert was the only thing imported
        content = content.replace(rnImportRegex + ';?\\n?', '');
      }

      // Add CustomAlert import after the react-native import
      const importInsertPoint = content.indexOf("from 'react-native'");
      if (importInsertPoint !== -1) {
        const lineEnd = content.indexOf('\n', importInsertPoint) + 1;
        content =
          content.slice(0, lineEnd) +
          `import { CustomAlert } from '${relativePath}';\n` +
          content.slice(lineEnd);
      } else {
        // If no react-native import found, add it at the top after the first import
        const firstImportEnd = content.indexOf('\n', content.indexOf('import ')) + 1;
        content =
          content.slice(0, firstImportEnd) +
          `import { CustomAlert } from '${relativePath}';\n` +
          content.slice(firstImportEnd);
      }
    }
  }

  // Only write if content changed
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    totalReplacements++;
    console.log(`✓ Updated ${file}`);
  }
});

console.log(`\nTotal files updated: ${totalReplacements}`);
