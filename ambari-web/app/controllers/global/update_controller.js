/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var App = require('app');

App.UpdateController = Em.Controller.extend({
  name:'updateController',
  isUpdated:false,
  cluster:null,
  isWorking: false,
  timeIntervalId: null,
  clusterName:function () {
    return App.router.get('clusterController.clusterName');
  }.property('App.router.clusterController.clusterName'),

  getUrl:function (testUrl, url) {
    return (App.testMode) ? testUrl : App.apiPrefix + '/clusters/' + this.get('clusterName') + url;
  },

  /**
   * Start polling, when <code>isWorking</code> become true
   */
  updateAll:function(){
    if(this.get('isWorking')) {
      App.updater.run(this, 'updateServices', 'isWorking');
      App.updater.run(this, 'updateHostConditionally', 'isWorking');
      App.updater.run(this, 'updateServiceMetricConditionally', 'isWorking', App.componentsUpdateInterval);
      App.updater.run(this, 'graphsUpdate', 'isWorking');
      if (App.supports.hostOverrides) {
        App.updater.run(this, 'updateComponentConfig', 'isWorking');
      }
    }
  }.observes('isWorking'),
  /**
   * Update hosts depending on which page is open
   * Make a call only on follow pages:
   * /main/hosts
   * /main/hosts/*
   * /main/charts/heatmap
   * @param callback
   */
  updateHostConditionally: function (callback) {
    var location = App.router.get('location.lastSetURL');
    if (/\/main\/(hosts|charts\/heatmap).*/.test(location)) {
      this.updateHost(callback);
    } else {
      callback();
    }
  },
  /**
   * Update service metrics depending on which page is open
   * Make a call only on follow pages:
   * /main/dashboard
   * /main/services/*
   * @param callback
   */
  updateServiceMetricConditionally: function(callback){
    var location = App.router.get('location.lastSetURL');
    if (/\/main\/(dashboard|services).*/.test(location)) {
      this.updateServiceMetric(callback);
    } else {
      callback();
    }
  },

  updateHost:function(callback) {
    var testUrl = App.get('isHadoop2Stack') ? '/data/hosts/HDP2/hosts.json' : '/data/hosts/hosts.json';
    var hostsUrl = this.getUrl(testUrl, '/hosts?fields=Hosts/host_name,Hosts/host_status,Hosts/last_heartbeat_time,Hosts/disk_info,Hosts/maintenance_state,' +
      'metrics/disk,metrics/load/load_one,metrics/cpu/cpu_system,metrics/cpu/cpu_user,metrics/memory/mem_total,metrics/memory/mem_free'+
      '&minimal_response=true');
    App.HttpClient.get(hostsUrl, App.hostsMapper, {
      complete: callback
    });
  },
  graphs: [],
  graphsUpdate: function (callback) {
      var existedGraphs = [];
      this.get('graphs').forEach(function (_graph) {
        var view = Em.View.views[_graph.id];
        if (view) {
          existedGraphs.push(_graph);
          //console.log('updated graph', _graph.name);
          view.loadData();
          //if graph opened as modal popup update it to
          if($(".modal-graph-line .modal-body #" + _graph.popupId + "-container-popup").length) {
            view.loadData();
          }
        }
      });
    callback();
    this.set('graphs', existedGraphs);
  },

  /**
   * Updates the services information. 
   *
   * @param callback
   * @param isInitialLoad  If true, only basic information is loaded.
   */
  updateServiceMetric: function (callback, isInitialLoad) {
    var self = this;
    self.set('isUpdated', false);

    var conditionalFields = [];
    var initialFields = [];
    var serviceSpecificParams = {
      'FLUME': "host_components/metrics/flume/flume",
      'YARN': "host_components/metrics/yarn/Queue," +
              "ServiceComponentInfo/rm_metrics/cluster/activeNMcount," +
              "ServiceComponentInfo/rm_metrics/cluster/unhealthyNMcount," +
              "ServiceComponentInfo/rm_metrics/cluster/rebootedNMcount," +
              "ServiceComponentInfo/rm_metrics/cluster/decommissionedNMcount",
      'HBASE': "host_components/metrics/hbase/master/IsActiveMaster," +
               "ServiceComponentInfo/MasterStartTime," +
               "ServiceComponentInfo/MasterActiveTime," +
               "ServiceComponentInfo/AverageLoad," +
               "ServiceComponentInfo/Revision," +
               "ServiceComponentInfo/RegionsInTransition",
      'MAPREDUCE': "ServiceComponentInfo/AliveNodes," +
                   "ServiceComponentInfo/GrayListedNodes," +
                   "ServiceComponentInfo/BlackListedNodes," +
                   "ServiceComponentInfo/jobtracker/*,"
    };
    var services = App.cache['services'];
    services.forEach(function (service) {
      var urlParams = serviceSpecificParams[service.ServiceInfo.service_name];
      if (urlParams) {
        conditionalFields.push(urlParams);
      }
    });
    var conditionalFieldsString = conditionalFields.length > 0 ? ',' + conditionalFields.join(',') : '';
    var initialFieldsString = initialFields.length > 0 ? ',' + initialFields.join(',') : '';
    var testUrl = App.get('isHadoop2Stack') ? '/data/dashboard/HDP2/master_components.json':'/data/dashboard/services.json';

    var realUrl = '/components/?ServiceComponentInfo/category=MASTER&fields=' +
      'ServiceComponentInfo/Version,' +
      'ServiceComponentInfo/StartTime,' +
      'ServiceComponentInfo/HeapMemoryUsed,' +
      'ServiceComponentInfo/HeapMemoryMax,' +
      'ServiceComponentInfo/service_name,' +
      'host_components/HostRoles/host_name,' +
      'host_components/HostRoles/state,' +
      'host_components/HostRoles/maintenance_state,' +
      'host_components/HostRoles/stale_configs,' +
      'host_components/metrics/jvm/memHeapUsedM,' +
      'host_components/metrics/jvm/HeapMemoryMax,' +
      'host_components/metrics/jvm/HeapMemoryUsed,' +
      'host_components/metrics/jvm/memHeapCommittedM,' +
      'host_components/metrics/mapred/jobtracker/trackers_decommissioned,' +
      'host_components/metrics/cpu/cpu_wio,' +
      'host_components/metrics/rpc/RpcQueueTime_avg_time,' +
      'host_components/metrics/dfs/FSNamesystem/*,' +
      'host_components/metrics/dfs/namenode/Version,' +
      'host_components/metrics/dfs/namenode/DecomNodes,' +
      'host_components/metrics/dfs/namenode/TotalFiles,' +
      'host_components/metrics/dfs/namenode/UpgradeFinalized,' +
      'host_components/metrics/dfs/namenode/Safemode,' +
      'host_components/metrics/runtime/StartTime' +
      conditionalFieldsString +
      '&minimal_response=true';

    var servicesUrl = isInitialLoad ? this.getUrl(testUrl, realUrl + initialFieldsString) : this.getUrl(testUrl, realUrl);
    callback = callback || function () {
      self.set('isUpdated', true);
    };
    App.HttpClient.get(servicesUrl, App.serviceMetricsMapper, {
      complete: function(){
        callback();
      }
    });
  },
  updateServices: function (callback) {
    var testUrl = '/data/services/HDP2/services.json';
    var componentConfigUrl = this.getUrl(testUrl, '/services?fields=alerts/summary,ServiceInfo/state,ServiceInfo/maintenance_state&minimal_response=true');
    App.HttpClient.get(componentConfigUrl, App.serviceMapper, {
      complete: callback
    });
  },
  updateComponentConfig: function (callback) {
    var testUrl = '/data/services/host_component_stale_configs.json';
    var componentConfigUrl = this.getUrl(testUrl, '/host_components?fields=HostRoles/host_name&HostRoles/stale_configs=true&minimal_response=true');
    App.HttpClient.get(componentConfigUrl, App.componentConfigMapper, {
      complete: callback
    });
  }

});
