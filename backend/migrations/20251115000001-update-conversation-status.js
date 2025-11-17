'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // SQL Server không support ALTER ENUM trực tiếp
    // Phải drop constraint và tạo lại
    await queryInterface.sequelize.query(`
      ALTER TABLE ChatConversations 
      DROP CONSTRAINT IF EXISTS ChatConversations_Status_check;
    `);
    
    await queryInterface.sequelize.query(`
      ALTER TABLE ChatConversations 
      ADD CONSTRAINT ChatConversations_Status_check 
      CHECK (Status IN ('active', 'pending_admin', 'closed'));
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE ChatConversations 
      DROP CONSTRAINT IF EXISTS ChatConversations_Status_check;
    `);
    
    await queryInterface.sequelize.query(`
      ALTER TABLE ChatConversations 
      ADD CONSTRAINT ChatConversations_Status_check 
      CHECK (Status IN ('active', 'closed'));
    `);
  }
};
