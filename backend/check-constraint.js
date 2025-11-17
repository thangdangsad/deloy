const { sequelize } = require('./models');

async function checkConstraint() {
  try {
    const [results] = await sequelize.query(`
      SELECT con.name, con.definition 
      FROM sys.check_constraints con 
      INNER JOIN sys.tables t ON con.parent_object_id = t.object_id 
      WHERE t.name = 'ChatConversations'
    `);
    
    console.log('Current CHECK constraints on ChatConversations:');
    console.log(JSON.stringify(results, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkConstraint();
