import { buildSubgraph as a } from './a.js';
import { buildSubgraph as b } from './b.js';
import { buildGateway } from './gateway.js';

(async () => {
  await Promise.all([a(4001), b(4002)]);
  await new Promise((r) => setTimeout(r, 1000));
  await buildGateway(4000);
})();
