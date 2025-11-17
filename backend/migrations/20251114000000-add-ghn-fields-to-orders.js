'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Orders', 'WardCode', {
      type: Sequelize.STRING(20),
      allowNull: true,
      after: 'City'
    });

    await queryInterface.addColumn('Orders', 'DistrictID', {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: 'WardCode'
    });

    await queryInterface.addColumn('GuestOrders', 'WardCode', {
      type: Sequelize.STRING(20),
      allowNull: true,
      after: 'City'
    });

    await queryInterface.addColumn('GuestOrders', 'DistrictID', {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: 'WardCode'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Orders', 'WardCode');
    await queryInterface.removeColumn('Orders', 'DistrictID');
    await queryInterface.removeColumn('GuestOrders', 'WardCode');
    await queryInterface.removeColumn('GuestOrders', 'DistrictID');
  }
};
