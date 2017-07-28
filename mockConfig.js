const okResponseSchema = {
  required: ['data', 'desc', 'status'],
  properties: {
    data: {
      properties: {},
      type: 'object',
    },
    desc: {
      type: 'string',
    },
    status: {
      enum: [
        1000,
      ],
      type: 'integer',
    },
  },
  type: 'object',
};

exports.okResponseSchema = okResponseSchema;