import type { FastifyInstance } from 'fastify';

export function build(app: FastifyInstance) {
  app.addSchema({
    $id: '#textCustomization',
    type: 'object',
    properties: {
      color: {
        type: 'string'
      },
      font: {
        type: 'string'
      }
    }
  });
  app.addSchema({
    $id: '#textOption',
    allOf: [
      {
        $ref: '#textCustomization'
      },
      {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            maxLength: 50
          }
        }
      }
    ]
  });
  app.addSchema({
    $id: '#wishlist',
    type: 'object',
    required: ['caps'],
    properties: {
      caps: {
        maxItems: 50,
        type: 'array',
        items: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string'
            },
            legend: {
              type: 'string',
              maxLength: 50
            },
            legendColor: {
              type: 'string'
            },
            isPriority: {
              type: 'boolean'
            }
          }
        }
      },
      tradeCaps: {
        type: 'array',
        maxItems: 10,
        items: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string'
            },
            legend: {
              type: 'string',
              maxLength: 50
            },
            legendColor: {
              type: 'string'
            }
          }
        }
      },
      settings: {
        type: 'object',
        properties: {
          capsPerLine: {
            type: 'integer'
          },
          priority: {
            $ref: '#textCustomization'
          },
          legends: {
            $ref: '#textCustomization'
          },
          title: {
            $ref: '#textOption'
          },
          tradeTitle: {
            $ref: '#textOption'
          },
          extraText: {
            $ref: '#textOption'
          },
          background: {
            type: 'object',
            properties: {
              color: {
                type: 'string'
              }
            }
          },
          social: {
            type: 'object',
            properties: {
              reddit: {
                type: 'string'
              },
              discord: {
                type: 'string'
              }
            }
          }
        }
      }
    }
  });
}
