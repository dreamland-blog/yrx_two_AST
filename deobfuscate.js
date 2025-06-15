const fs = require('fs');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

const obfuscatedCode = fs.readFileSync('demo.js', 'utf8');

const ast = parser.parse(obfuscatedCode, {
  sourceType: 'script',
  allowReturnOutsideFunction: true,
  allowAwaitOutsideFunction: true,
  errorRecovery: true,
  tokens: true
});

const variableMappings = new Map();
let varCounter = 0;

function evaluateExpression(expr) {
  try {
    return new Function(`return ${expr}`)();
  } catch (e) {
    return null;
  }
}

const visitor = {
  Identifier: {
    enter(path) {
      if (path.node.name.includes('yrx_')) {
        if (!variableMappings.has(path.node.name)) {
          // Create more descriptive names for specific patterns if possible
          if (path.node.name === 'yrx_ﱞ') {
            variableMappings.set(path.node.name, 'param');
          } else if (path.node.name === 'yrx_ﱞﱞ') {
            variableMappings.set(path.node.name, 'func');
          } else if (path.node.name === 'yrx_ﱞﱞﱞ') {
            variableMappings.set(path.node.name, 'data');
          } else if (path.node.name === 'yrx_ﱞﱞﱞﱞ') {
            variableMappings.set(path.node.name, 'index');
          } else {
            variableMappings.set(path.node.name, `var_${varCounter++}`);
          }
        }
        path.node.name = variableMappings.get(path.node.name);
      }
    }
  },

  BinaryExpression: {
    exit(path) {
      if (
        t.isNumericLiteral(path.node.left) && 
        t.isNumericLiteral(path.node.right) &&
        ['+', '-', '*', '/', '%', '<<', '>>', '>>>'].includes(path.node.operator)
      ) {
        const expr = generate(path.node).code;
        const result = evaluateExpression(expr);
        
        if (result !== null) {
          path.replaceWith(t.numericLiteral(result));
          path.skip();
        }
      }
    }
  },

  ConditionalExpression: {
    exit(path) {
      // If the test is a literal boolean, replace with the appropriate consequent/alternate
      if (t.isBooleanLiteral(path.node.test)) {
        path.replaceWith(
          path.node.test.value ? path.node.consequent : path.node.alternate
        );
        path.skip();
      }
      
      // Evaluate numeric comparisons
      if (
        t.isBinaryExpression(path.node.test) &&
        t.isNumericLiteral(path.node.test.left) &&
        t.isNumericLiteral(path.node.test.right) &&
        ['==', '===', '!=', '!==', '<', '<=', '>', '>='].includes(path.node.test.operator)
      ) {
        const expr = generate(path.node.test).code;
        const result = evaluateExpression(expr);
        
        if (result !== null) {
          path.replaceWith(
            result ? path.node.consequent : path.node.alternate
          );
          path.skip();
        }
      }
    }
  },

  LogicalExpression: {
    exit(path) {
      if (t.isBooleanLiteral(path.node.left) && t.isBooleanLiteral(path.node.right)) {
        const expr = generate(path.node).code;
        const result = evaluateExpression(expr);
        
        if (result !== null) {
          path.replaceWith(t.booleanLiteral(result));
          path.skip();
        }
      }
    }
  },

  UnaryExpression: {
    exit(path) {
      // Evaluate unary expressions with literals
      if (t.isNumericLiteral(path.node.argument) || t.isBooleanLiteral(path.node.argument)) {
        const expr = generate(path.node).code;
        const result = evaluateExpression(expr);
        
        if (result !== null) {
          if (typeof result === 'number') {
            path.replaceWith(t.numericLiteral(result));
          } else if (typeof result === 'boolean') {
            path.replaceWith(t.booleanLiteral(result));
          }
          path.skip();
        }
      }
    }
  },

  StringLiteral: {
    enter(path) {
      if (
        path.parent.type === 'BinaryExpression' &&
        path.parent.operator === '+' &&
        t.isStringLiteral(path.parent.right)
      ) {
        const left = path.node.value;
        const right = path.parent.right.value;
        path.parentPath.replaceWith(t.stringLiteral(left + right));
      }
    }
  },

  IfStatement: {
    enter(path) {
      if (t.isBooleanLiteral(path.node.test)) {
        if (path.node.test.value) {
          path.replaceWith(path.node.consequent);
        } else if (path.node.alternate) {
          path.replaceWith(path.node.alternate);
        } else {
          path.remove();
        }
      }
    }
  },

  MemberExpression: {
    exit(path) {
      if (
        t.isNumericLiteral(path.node.property) && 
        !path.node.computed
      ) {
        path.node.computed = true;
      }
      
      if (
        t.isArrayExpression(path.node.object) && 
        t.isNumericLiteral(path.node.property) &&
        path.node.computed
      ) {
        const index = path.node.property.value;
        const elements = path.node.object.elements;
        
        if (index >= 0 && index < elements.length) {
          path.replaceWith(elements[index]);
        }
      }
    }
  }
};

traverse(ast, visitor);

const deobfuscatedCode = generate(ast, {
  comments: false,
  compact: false,
  retainLines: false,
  jsescOption: {
    minimal: true
  }
}).code;

fs.writeFileSync('deo.js', deobfuscatedCode);

console.log('Deobfuscation complete. Output saved to deobfuscated.js');
console.log(`Replaced ${variableMappings.size} obfuscated variable names.`); 