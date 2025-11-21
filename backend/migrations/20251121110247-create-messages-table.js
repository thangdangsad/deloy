'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('Messages', {
            Id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            Sender: {
                type: Sequelize.STRING,
                allowNull: false
            },
            Message: {
                type: Sequelize.TEXT, // Sequelize.TEXT tương ứng NVARCHAR(MAX) với MSSQL
                allowNull: false
            },
            CreatedAt: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('GETDATE()')
            },
            UpdatedAt: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('GETDATE()')
            }
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('Messages');
    }
};
