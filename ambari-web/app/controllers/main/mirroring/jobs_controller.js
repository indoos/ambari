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

App.MainDatasetJobsController = Em.Controller.extend({
  name: 'mainDatasetJobsController',

  isLoaded: function () {
    return App.router.get('mainMirroringController.isLoaded');
  }.property('App.router.mainMirroringController.isLoaded'),

  jobs: function () {
    var datasetName = this.get('content.name');
    var mainMirroringController = App.router.get('mainMirroringController');
    return (this.get('isLoaded') && datasetName) ?
        mainMirroringController.get('datasets').findProperty('name', datasetName).get('datasetJobs') : [];
  }.property('content', 'isLoaded'),

  actionDesc: function () {
    var dataset_status = this.get('content.status');
    if (dataset_status === "SCHEDULED") {
      return "Suspend";
    } else {
      return "Schedule";
    }
  }.property('content.status'),

  isScheduled: function () {
    var dataset_status = this.get('content.status');
    return dataset_status === "SCHEDULED";
  }.property('content.status'),

  suspend: function () {
    App.ajax.send({
      name: 'mirroring.suspend_entity',
      sender: this,
      data: {
        name: this.get('content.name'),
        type: 'feed',
        falconServer: App.get('falconServerURL')
      },
      success: 'onSuspendSuccess',
      error: 'onError'
    });
  },

  onSuspendSuccess: function() {
    this.set('content.status', 'SUSPENDED');
  },

  schedule: function () {
    App.ajax.send({
      name: 'mirroring.schedule_entity',
      sender: this,
      data: {
        name: this.get('content.name'),
        type: 'feed',
        falconServer: App.get('falconServerURL')
      },
      success: 'onScheduleSuccess',
      error: 'onError'
    });
  },

  onScheduleSuccess: function() {
    this.set('content.status', 'RUNNING');
  },


  delete: function () {
    var self = this;
    App.showConfirmationPopup(function () {
      App.ajax.send({
        name: 'mirroring.delete_entity',
        sender: self,
        data: {
          name: self.get('content.name'),
          type: 'feed',
          falconServer: App.get('falconServerURL')
        },
        success: 'onDeleteSuccess',
        error: 'onError'
      });
    });
  },

  onDeleteSuccess: function() {
    this.get('content').deleteRecord();
    App.store.commit();
  },

  suspendInstance: function (event) {
    App.ajax.send({
      name: 'mirroring.suspend_instance',
      sender: this,
      data: {
        feed: this.get('content.name'),
        name: event.context.get('name'),
        job: event.context,
        falconServer: App.get('falconServerURL')
      },
      error: 'onError'
    });
  },

  resumeInstance: function (event) {
    App.ajax.send({
      name: 'mirroring.resume_instance',
      sender: this,
      data: {
        feed: this.get('content.name'),
        name: event.context.get('name'),
        job: event.context,
        falconServer: App.get('falconServerURL')
      },
      error: 'onError'
    });
  },

  killInstance: function (event) {
    App.ajax.send({
      name: 'mirroring.kill_instance',
      sender: this,
      data: {
        feed: this.get('content.name'),
        name: event.context.get('name'),
        job: event.context,
        falconServer: App.get('falconServerURL')
      },
      error: 'onError'
    });
  },

  onError: function () {
    App.showAlertPopup(Em.I18n.t('common.error'), arguments[2]);
  },

  downloadEntity: function () {
    var xml = this.formatDatasetXML(this.get('content'));
    if ($.browser.msie && $.browser.version < 10) {
      this.openInfoInNewTab(xml);
    } else {
      try {
        var blob = new Blob([xml], {type: 'text/xml;charset=utf-8;'});
        saveAs(blob, Em.I18n.t('mirroring.dataset.entity') + '.xml');
      } catch (e) {
        this.openInfoInNewTab(xml);
      }
    }
  },

  openInfoInNewTab: function (xml) {
    var newWindow = window.open('');
    var newDocument = newWindow.document;
    newDocument.write('<pre>' + App.config.escapeXMLCharacters(xml) + '</pre>');
    newWindow.focus();
  },

  formatDatasetXML: function (dataset) {
    return '<?xml version="1.0"?>\n' + '<feed description="" name="' + dataset.get('name') + '" xmlns="uri:falcon:feed:0.1">\n' +
        '<frequency>' + dataset.get('frequencyUnit') + '(' + dataset.get('frequency') + ')' + '</frequency>\n' +
        '<clusters>\n<cluster name="' + dataset.get('sourceClusterName') + '" type="source">\n' +
        '<validity start="' + dataset.get('scheduleStartDate') + '" end="' + dataset.get('scheduleEndDate') + '"/>\n' +
        '<retention limit="days(7)" action="delete"/>\n</cluster>\n<cluster name="' + dataset.get('targetClusterName') +
        '" type="target">\n<validity start="' + dataset.get('scheduleStartDate') + '" end="' + dataset.get('scheduleEndDate') + '"/>\n' +
        '<retention limit="months(1)" action="delete"/>\n<locations>\n<location type="data" path="' + dataset.get('targetDir') + '" />\n' +
        '</locations>\n</cluster>\n</clusters>\n<locations>\n<location type="data" path="' + dataset.get('sourceDir') + '" />\n' +
        '</locations>\n<ACL owner="hue" group="users" permission="0755" />\n<schema location="/none" provider="none"/>\n</feed>';
  }
});
