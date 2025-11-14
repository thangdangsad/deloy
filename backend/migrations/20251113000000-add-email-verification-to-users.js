'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.addColumn('Users', 'IsEmailVerified', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await queryInterface.addColumn('Users', 'EmailVerificationToken', {
      type: Sequelize.STRING(255),
      allowNull: true
    });

    await queryInterface.addColumn('Users', 'EmailVerificationExpires', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('Users', 'HasReceivedWelcomeVoucher', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn('Users', 'IsEmailVerified');
    await queryInterface.removeColumn('Users', 'EmailVerificationToken');
    await queryInterface.removeColumn('Users', 'EmailVerificationExpires');
    await queryInterface.removeColumn('Users', 'HasReceivedWelcomeVoucher');
  }
};
