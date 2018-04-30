module.exports = {
  "type": "object",
  "properties": {
    "rules": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "enabled": {
            "type": "boolean"
          },
          "source": {
            "type": "object",
            "properties": {
              "hostname": {
                "type": "string"
              },
              "url": {
                "type": "string"
              },
              "methods": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              }
            },
            "required": ["url"]
          },
          "target": {
            "type": "object",
            "properties": {
              "hostname": {
                "type": "string"
              },
              "ip": {
                "type": "string",
                "pattern": "^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$"
              },
              "port": {
                "type": "integer"
              },
              "url": {
                "type": "string"
              },
              "authentication": {
                "type": "object",
                "oneOf": [{
                  "properties": {
                    "enabled": {
                      "type": "boolean"
                    },
                    "type": {
                      "type": "string",
                      "enum": ["basic"]
                    },
                    "username": {
                      "type": "string"
                    },
                    "password": {
                      "type": "string"
                    }
                  },
                  "required" : ["type", "username", "password"]
                }]
              },
              "request": {
                "type": "object",
                "properties": {
                  "headers": {
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "name": {
                          "type": "string",
                          "minLength": 1
                        },
                        "value": {
                          "type": ["string", "null"]
                        }
                      },
                      "required": ["name", "value"]
                    }
                  }
                }
              },
              "response": {
                "type": "object",
                "properties": {
                  "headers": {
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "name": {
                          "type": "string",
                          "minLength": 1
                        },
                        "value": {
                          "type": ["string", "null"]
                        }
                      },
                      "required": ["name", "value"]
                    }
                  }
                }
              }
            },
            "required": ["hostname", "url"]
          }
        },
        "required": ["id", "source", "target"]
      }
    }
  }
};