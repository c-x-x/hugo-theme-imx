const fs = require('fs');
const path = require('path');

const [outputDir, ...expectations] = process.argv.slice(2);

if (!outputDir || expectations.length === 0) {
  console.error('Usage: node scripts/verify-navigation-output.js OUTPUT_DIR PAGE=EXPECTED_HREF [...]');
  process.exit(2);
}

function readAttribute(tag, name) {
  const match = tag.match(new RegExp(`(?:^|\\s)${name}\\s*=(?:"([^"]*)"|'([^']*)'|([^\\s>]*))`));
  return match ? (match[1] || match[2] || match[3] || '') : '';
}

function hasClass(tag, className) {
  return readAttribute(tag, 'class').split(/\s+/).includes(className);
}

function findTagByClass(html, tagName, className, startIndex = 0) {
  const tagPattern = new RegExp(`<${tagName}\\b[^>]*>`, 'g');
  tagPattern.lastIndex = startIndex;

  for (let match = tagPattern.exec(html); match; match = tagPattern.exec(html)) {
    if (hasClass(match[0], className)) {
      return { index: match.index, tag: match[0] };
    }
  }

  return null;
}

for (const expectation of expectations) {
  const separator = expectation.indexOf('=');
  if (separator < 1) {
    console.error(`Invalid navigation expectation: ${expectation}`);
    process.exit(2);
  }

  const relativePath = expectation.slice(0, separator);
  const expectedHref = expectation.slice(separator + 1);
  const filePath = path.join(outputDir, relativePath);
  const html = fs.readFileSync(filePath, 'utf8');
  const menuStart = findTagByClass(html, 'ul', 'navbar-menu');
  const menuEnd = menuStart
    ? findTagByClass(html, 'li', 'navbar-menu-outline', menuStart.index + menuStart.tag.length)
    : null;

  if (!menuStart || !menuEnd) {
    console.error(`Generated page does not contain the primary navigation: ${filePath}`);
    process.exit(1);
  }

  const menuHTML = html.slice(menuStart.index + menuStart.tag.length, menuEnd.index);
  const links = menuHTML.match(/<a\b[^>]*>/g) || [];
  const currentLinks = links.filter(link =>
    hasClass(link, 'active') && readAttribute(link, 'aria-current') === 'page'
  );

  if (currentLinks.length !== 1) {
    console.error(`Expected exactly one current primary navigation item in ${filePath}; found ${currentLinks.length}.`);
    process.exit(1);
  }

  const actualHref = readAttribute(currentLinks[0], 'href');
  if (actualHref !== expectedHref) {
    console.error(`Expected current navigation href '${expectedHref}' in ${filePath}; found '${actualHref}'.`);
    process.exit(1);
  }
}
