(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = global || self, global.VueFusionCharts = factory());
}(this, (function () { 'use strict';

  const addDep = (FC, modules) => {
    if (FC) {
      if (
        (modules.getName && modules.getType) ||
        (modules.name && modules.type)
      ) {
        FC.addDep(modules);
      } else {
        modules(FC);
      }
    }
  };

  function checkIfDataTableExists(dataSource) {
    // eslint-disable-next-line no-underscore-dangle
    if (dataSource && dataSource.data && dataSource.data._dataStore) {
      return true;
    }
    return false;
  }

  function cloneDataSource(obj, purpose = 'clone') {
    const type = typeof obj;
    if (
      type === 'string' ||
      type === 'number' ||
      type === 'function' ||
      type === 'boolean'
    ) {
      return obj;
    }
    if (obj === null || obj === undefined) {
      return obj;
    }
    if (Array.isArray(obj)) {
      const arr = [];
      for (let i = 0; i < obj.length; i++) {
        arr.push(cloneDataSource(obj[i]));
      }
      return arr;
    }
    if (typeof obj === 'object') {
      const clonedObj = {};
      // eslint-disable-next-line guard-for-in
      // eslint-disable-next-line no-restricted-syntax
      for (const prop in obj) {
        // Edge case handling for DataTable
        if (prop === 'data') {
          // eslint-disable-next-line no-underscore-dangle
          if (obj[prop] && obj[prop]._dataStore && purpose === 'clone') {
            clonedObj[prop] = obj[prop];
            // eslint-disable-next-line no-underscore-dangle
          } else if (obj[prop] && obj[prop]._dataStore && purpose === 'diff') {
            clonedObj[prop] = '-';
          } else {
            clonedObj[prop] = cloneDataSource(obj[prop]);
          }
          continue;
        }
        clonedObj[prop] = cloneDataSource(obj[prop]);
      }
      return clonedObj;
    }
    return undefined;
  }

  const { optionsMap, props } = require('./config.js');
  const cloneDeep = require('lodash/cloneDeep');

  var _FCComponent = (FC, ...options) => {
    options &&
      options.forEach &&
      options.forEach(modules => {
        addDep(FC, modules);
      });
    return {
      name: 'fusioncharts',
      template: '<div></div>',
      render: function(h) {
        this.containerID = 'fc-' + this._uid;
        return h('div', {
          attrs: {
            id: this.containerID
          }
        });
      },
      props,
      methods: {
        attachListeners: function() {
          if (this.$listeners && typeof this.$listeners === 'object') {
            Object.keys(this.$listeners).forEach(event => {
              this.chartObj.addEventListener(event, e => {
                this.$emit(event, e);
              });
            });
          }
        },
        createEvents: function() {
          const ret = {
            events: {}
          };
          if (this.$listeners && typeof this.$listeners === 'object') {
            Object.keys(this.$listeners).forEach(event => {
              ret.events[event] = e => {
                this.$emit(event, e);
              };
            });
          }
          return ret;
        },
        setLastOptions: function(config) {
          this._oldOptions = Object.assign({}, config);
        },
        getLastOptions: function() {
          return this._oldOptions;
        },
        getOptions: function() {
          let config = {},
            THIS = this;
          for (let i in optionsMap) {
            if (THIS[i] !== undefined && THIS[i] !== null) {
              config[optionsMap[i]] = THIS[i];
            }
          }

          let options = Object.assign(Object.assign({}, THIS.options), config);

          return options;
        },
        renderChart: function() {
          let THIS = this,
            config = THIS.getOptions(),
            chartObj = THIS.chartObj;

          config.renderAt = this.containerID;
          THIS.setLastOptions(config);

          if (chartObj && chartObj.dispose) {
            chartObj.dispose();
          }
          const events = this.createEvents();
          config.events = Object.assign({}, config.events, events.events);

          let ds = config.dataSource || config.datasource;

          if (checkIfDataTableExists(ds))
            this.prevDataSource = cloneDataSource(ds, 'diff');
          else this.prevDataSource = cloneDataSource(ds, 'clone');

          THIS.chartObj = chartObj = new FC(config);
          chartObj.render();
        },
        updateChart: function() {
          let THIS = this,
            config = THIS.getOptions(),
            prevConfig = THIS.getLastOptions(),
            chartObj = THIS.chartObj;

          if (
            config.width !== prevConfig.width ||
            config.height !== prevConfig.height
          ) {
            chartObj && chartObj.resizeTo(config.width, config.height);
          } else if (config.type !== prevConfig.type) {
            chartObj.chartType(config.type);
          } else {
            if (!checkIfDataTableExists(config.dataSource))
              chartObj.setChartData(config.dataSource, config.dataFormat);
          }

          THIS.setLastOptions(config);
        }
      },
      watch: {
        type: function() {
          this.chartObj.chartType(this.type);
        },
        width: function() {
          this.chartObj.resizeTo(this.width, this.height);
        },
        height: function() {
          this.chartObj.resizeTo(this.width, this.height);
        },
        options: {
          handler: function() {
            this.updateChart();
          },
          deep: true
        },
        dataSource: {
          handler: function() {
            if (!checkIfDataTableExists(this.dataSource)) {
              this.chartObj.setChartData(
                this.datasource || this.dataSource,
                this.dataFormat || this.dataformat
              );
            }
          },
          deep: true
        },
        datasource: {
          handler: function() {
            if (!checkIfDataTableExists(this.datasource)) {
              this.chartObj.setChartData(
                this.datasource || this.dataSource,
                this.dataFormat || this.dataformat
              );
            }
          },
          deep: true
        },
        'datasource.data': {
          handler: function(newVal, prevVal) {
            if (newVal !== prevVal) {
              let clonedDataSource;
              if (this.datasource.series) {
                clonedDataSource = cloneDeep(this.datasource);
              } else clonedDataSource = this.datasource;
              this.chartObj.setChartData(
                clonedDataSource,
                this.dataFormat || this.dataformat
              );
            }
          },
          deep: false
        },
        'dataSource.data': {
          handler: function(newVal, prevVal) {
            if (newVal !== prevVal) {
              let clonedDataSource;
              if (this.dataSource.series) {
                clonedDataSource = cloneDeep(this.dataSource);
              } else clonedDataSource = this.dataSource;
              this.chartObj.setChartData(
                clonedDataSource,
                this.dataFormat || this.dataformat
              );
            }
          },
          deep: false
        }
      },
      deactivated: function() {
        this.chartObj && this.chartObj.dispose();
      },
      beforeDestroy: function() {
        this.chartObj && this.chartObj.dispose();
      },
      mounted: function() {
        this.renderChart();
      },
      ready: function() {
        this.renderChart();
      },
      beforeUpdate: function() {
        const strPrevClonedDataSource = JSON.stringify(this.prevDataSource);
        let ds = this.datasource || this.dataSource || this.options.dataSource;
        const strCurrClonedDataSource = JSON.stringify(
          cloneDataSource(ds, 'diff')
        );
        if (strPrevClonedDataSource !== strCurrClonedDataSource) {
          this.prevDataSource = cloneDataSource(ds, 'diff');
          if (ds.series) {
            ds = cloneDeep(ds);
          }
          this.chartObj.setChartData(ds, this.dataFormat || this.dataformat);
        }
      }
    };
  };

  const install = (Vue, FC, ...options) => {
    let component = _FCComponent(FC, ...options);
    Vue.component(component.name, component);
  };

  return install;

})));
