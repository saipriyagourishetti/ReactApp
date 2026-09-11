'use strict';

const calculator = require('./calculator');
const { UserStore } = require('./userStore');

function runDemo() {
  console.log('=== Dummy Project Demo ===\n');

  console.log('-- Calculator --');
  console.log('add(2, 3)        =', calculator.add(2, 3));
  console.log('subtract(10, 4)  =', calculator.subtract(10, 4));
  console.log('multiply(6, 7)   =', calculator.multiply(6, 7));
  console.log('divide(9, 3)     =', calculator.divide(9, 3));
  console.log('power(2, 10)     =', calculator.power(2, 10));
  console.log('sum([1..5])      =', calculator.sum([1, 2, 3, 4, 5]));
  console.log('average([1..5])  =', calculator.average([1, 2, 3, 4, 5]));

  console.log('\n-- User Store --');
  const store = new UserStore([
    { name: 'Ada Lovelace', email: 'ada@example.com', role: 'admin' },
    { name: 'Alan Turing', email: 'alan@example.com' },
  ]);

  store.create({ name: 'Grace Hopper', email: 'grace@example.com', role: 'admin' });
  store.update(2, { role: 'editor' });

  for (const user of store.list()) {
    console.log(`#${user.id} ${user.name.padEnd(15)} ${user.email.padEnd(22)} [${user.role}]`);
  }

  console.log('\nAdmins:', store.list({ role: 'admin' }).map((u) => u.name).join(', '));
  console.log('Total users:', store.size);
  console.log('\nDemo finished successfully.');
}

if (require.main === module) {
  runDemo();
}

module.exports = { runDemo, calculator, UserStore };
