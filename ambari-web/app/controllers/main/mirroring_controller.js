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
var misc = require('utils/misc');

App.MainMirroringController = Em.ArrayController.extend({
  name: 'mainMirroringController',

  datasetsData: [],

  // formatted data for targetClusterMapper
  clustersData: {},

  // counter for datasets load queries
  datasetCount: 0,

  // counter for target cluster load queries
  clusterCount: 0,

  datasets: [],

  selectedDataset: null,

  isDatasetsLoaded: false,

  isTargetClustersLoaded: false,

  isLoaded: function () {
    return this.get('isDatasetsLoaded') && this.get('isTargetClustersLoaded');
  }.property('isDatasetsLoaded', 'isTargetClustersLoaded'),

  loadData: function () {
    this.set('isDatasetsLoaded', false);
    this.set('isTargetClustersLoaded', false);
    this.get('datasetsData').clear();
    this.set('clustersData', {});
    this.set('datasetCount', 0);
    this.set('clusterCount', 0);
    this.set('datasets', []);
    this.loadDatasets();
    this.loadClusters();
  },

  loadDatasets: function () {
    App.ajax.send({
      name: 'mirroring.get_all_entities',
      sender: this,
      data: {
        type: 'feed',
        falconServer: App.get('falconServerURL')
      },
      success: 'onLoadDatasetsListSuccess',
      error: 'onLoadDatasetsListError'
    });
  },

  onLoadDatasetsListSuccess: function (data) {
    var parsedData = misc.xmlToObject(data);
    var datasets = parsedData.entities.entity;
    if (data && datasets) {
      datasets = Em.isArray(datasets) ? datasets : [datasets];
      this.set('datasetCount', datasets.length);
      datasets.forEach(function (dataset) {
        App.ajax.send({
          name: 'mirroring.get_definition',
          sender: this,
          data: {
            name: dataset.name['#text'],
            type: 'feed',
            status: dataset.status['#text'],
            falconServer: App.get('falconServerURL')
          },
          success: 'onLoadDatasetDefinitionSuccess',
          error: 'onLoadDatasetDefinitionError'
        });
      }, this);
    } else {
      this.set('isDatasetsLoaded', true);
    }
  },

  onLoadDatasetsListError: function () {
    console.error('Failed to load datasets list.');
  },

  onLoadDatasetDefinitionSuccess: function (data) {
    var parsedData = misc.xmlToObject(data);
    var clusters = parsedData.feed.clusters;
    var targetCluster, sourceCluster;

    if (clusters.cluster[0].locations) {
      targetCluster = clusters.cluster[0];
      sourceCluster = clusters.cluster[1];
    } else {
      targetCluster = clusters.cluster[1];
      sourceCluster = clusters.cluster[0];
    }
    this.get('datasetsData').push(
        Ember.Object.create({
          name: parsedData.feed['@attributes'].name,
          status: arguments[2].status,
          sourceClusterName: sourceCluster['@attributes'].name,
          targetClusterName: targetCluster['@attributes'].name,
          sourceDir: parsedData.feed.locations.location['@attributes'].path,
          targetDir: targetCluster.locations.location['@attributes'].path,
          frequency: parsedData.feed.frequency['#text'].match(/\d/)[0],
          frequencyUnit: parsedData.feed.frequency['#text'].match(/\w+(?=\()/)[0],
          scheduleEndDate: sourceCluster.validity['@attributes'].end,
          scheduleStartDate: sourceCluster.validity['@attributes'].start,
          instances: []
        })
    );
    App.ajax.send({
      name: 'mirroring.dataset.get_all_instances',
      sender: this,
      data: {
        dataset: parsedData.feed['@attributes'].name,
        start: sourceCluster.validity['@attributes'].start,
        end: sourceCluster.validity['@attributes'].end,
        falconServer: App.get('falconServerURL')
      },
      success: 'onLoadDatasetInstancesSuccess',
      error: 'onLoadDatasetsInstancesError'
    });
  },

  onLoadDatasetDefinitionError: function () {
    console.error('Failed to load dataset definition.');
  },

  onLoadDatasetInstancesSuccess: function (data, sender, opts) {
    var datasetsData = this.get('datasetsData');
    if (data.instances) {
      var datasetJobs = [];
      data.instances.forEach(function (instance) {
        datasetJobs.push({
          dataset: opts.dataset,
          id: instance.instance + '_' + opts.dataset,
          name: instance.instance,
          status: instance.status,
          endTime: new Date(instance.endTime).getTime(),
          startTime: new Date(instance.startTime).getTime()
        });
      }, this);
      datasetsData.findProperty('name', opts.dataset).set('instances', datasetJobs);
    }
    this.set('datasetCount', this.get('datasetCount') - 1);
    if (this.get('datasetCount') < 1) {
      var sortedDatasets = [];
      App.dataSetMapper.map(datasetsData);
      sortedDatasets = App.Dataset.find().toArray().sort(function (a, b) {
        if (a.get('name') < b.get('name'))  return -1;
        if (a.get('name') > b.get('name'))  return 1;
        return 0;
      });
      this.set('datasets', sortedDatasets);
      this.set('isDatasetsLoaded', true);
      var selectedDataset = this.get('selectedDataset');
      if (!selectedDataset) {
        this.set('selectedDataset', sortedDatasets[0]);
      }
    }
  },

  onLoadDatasetsInstancesError: function () {
    console.error('Failed to load dataset instances.');
  },

  loadClusters: function () {
    App.ajax.send({
      name: 'mirroring.get_all_entities',
      sender: this,
      data: {
        type: 'cluster',
        falconServer: App.get('falconServerURL')
      },
      success: 'onLoadClustersListSuccess',
      error: 'onLoadClustersListError'
    });
  },

  onLoadClustersListSuccess: function (data) {
    var clustersData = this.get('clustersData');
    clustersData.items = [];
    var parsedData = misc.xmlToObject(data);
    var clusters = parsedData.entities.entity;
    if (data && clusters) {
      clusters = Em.isArray(clusters) ? clusters : [clusters];
      this.set('clusterCount', clusters.length);
      clusters.mapProperty('name.#text').forEach(function (cluster) {
        App.ajax.send({
          name: 'mirroring.get_definition',
          sender: this,
          data: {
            name: cluster,
            type: 'cluster',
            falconServer: App.get('falconServerURL')
          },
          success: 'onLoadClusterDefinitionSuccess',
          error: 'onLoadClusterDefinitionError'
        });
      }, this);
    } else {
      var sourceCluster = Ember.Object.create({
        name: App.get('clusterName'),
        execute: App.HostComponent.find().findProperty('componentName', 'RESOURCEMANAGER').get('host.hostName') + ':8050',
        readonly: 'hftp://' + App.HostComponent.find().findProperty('componentName', 'NAMENODE').get('host.hostName') + ':50070',
        workflow: 'http://' + App.HostComponent.find().findProperty('componentName', 'OOZIE_SERVER').get('host.hostName') + ':11000/oozie',
        staging: '/apps/falcon/sandbox/staging',
        working: '/apps/falcon/sandbox/working',
        temp: '/tmp'
      });
      var sourceClusterData = App.router.get('mainMirroringManageClustersController').formatClusterXML(sourceCluster);
      App.ajax.send({
        name: 'mirroring.submit_entity',
        sender: this,
        data: {
          type: 'cluster',
          entity: sourceClusterData,
          falconServer: App.get('falconServerURL')
        },
        success: 'onSourceClusterCreateSuccess',
        error: 'onSourceClusterCreateError'
      });
      clustersData.items.push(sourceCluster);
    }
  },

  onLoadClustersListError: function () {
    console.error('Failed to load clusters list.');
  },

  onSourceClusterCreateSuccess: function () {
    App.targetClusterMapper.map(this.get('clustersData'));
    this.set('isTargetClustersLoaded', true);
  },

  onSourceClusterCreateError: function () {
    console.error('Error in creating source cluster entity.');
  },

  onLoadClusterDefinitionSuccess: function (data) {
    var parsedData = misc.xmlToObject(data);
    var clustersData = this.get('clustersData');
    var interfaces = parsedData.cluster.interfaces.interface;
    var locations = parsedData.cluster.locations.location;
    var staging = locations.findProperty('@attributes.name', 'staging');
    var working = locations.findProperty('@attributes.name', 'working');
    var temp = locations.findProperty('@attributes.name', 'temp');
    clustersData.items.push(
        {
          name: parsedData.cluster['@attributes'].name,
          execute: interfaces.findProperty('@attributes.type', 'execute')['@attributes'].endpoint,
          readonly: interfaces.findProperty('@attributes.type', 'readonly')['@attributes'].endpoint,
          workflow: interfaces.findProperty('@attributes.type', 'workflow')['@attributes'].endpoint,
          staging: staging && staging['@attributes'].path,
          working: working && working['@attributes'].path,
          temp: temp && temp['@attributes'].path
        }
    );
    this.set('clusterCount', this.get('clusterCount') - 1);
    if (this.get('clusterCount') < 1) {
      App.targetClusterMapper.map(clustersData);
      this.set('isTargetClustersLoaded', true);
    }
  },

  onLoadClusterDefinitionError: function () {
    console.error('Failed to load cluster definition.');
  },

  onDataLoad: function () {
    if (this.get('isLoaded') && App.router.get('currentState.name') === 'index') {
      App.router.send('gotoShowJobs');
    }
  }.observes('isLoaded'),

  manageClusters: function () {
    var self = this;
    var manageClustersController = App.router.get('mainMirroringManageClustersController');
    var popup = App.ModalPopup.show({
      header: Em.I18n.t('mirroring.dataset.manageClusters'),
      bodyClass: App.MainMirroringManageClusterstView.extend({
        controller: manageClustersController
      }),
      primary: Em.I18n.t('common.save'),
      secondary: null,
      onPrimary: function () {
        manageClustersController.save();
      },
      hide: function () {
        self.loadData();
        App.router.send('gotoShowJobs');
        this._super();
      },
      didInsertElement: function () {
        this._super();
        this.fitHeight();
      }
    });
    manageClustersController.set('popup', popup);
  }
});
