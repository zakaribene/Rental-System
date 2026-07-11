const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Rental Management System API",
      version: "1.0.0",
      description: "Multi-tenant SaaS API for rental/deposit management (bags, clothing, etc.)"
    },
    servers: [{ url: "/api" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: "Auth" },
      { name: "Stores" },
      { name: "Users" },
      { name: "Customers" },
      { name: "Products" },
      { name: "Payment Methods" },
      { name: "Payments" },
      { name: "Rentals" },
      { name: "Reports" }
    ]
  },
  apis: ["./routes/*.js"]
};

module.exports = swaggerJsdoc(options);
