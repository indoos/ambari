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
var date = require('utils/date');

App.MainHostDetailsView = Em.View.extend({
  templateName: require('templates/main/host/details'),

  content: function(){
    return App.router.get('mainHostDetailsController.content');
  }.property('App.router.mainHostDetailsController.content'),

  isActive: function() {
    return this.get('controller.content.passiveState') === "OFF";
  }.property('controller.content.passiveState'),

  maintenance: function(){
    var onOff = this.get('isActive') ? "On" : "Off";
    return [
      {action: 'startAllComponents', liClass: (this.get('controller.content.isNotHeartBeating')?'disabled':'enabled'), cssClass: 'icon-play', 'label': this.t('hosts.host.details.startAllComponents')},
      {action: 'stopAllComponents', liClass: (this.get('controller.content.isNotHeartBeating')?'disabled':'enabled'), cssClass: 'icon-stop', 'label': this.t('hosts.host.details.stopAllComponents')},
      {action: 'restartAllComponents', liClass: (this.get('controller.content.isNotHeartBeating')?'disabled':'enabled'), cssClass: 'icon-forward', 'label': this.t('hosts.host.details.restartAllComponents')},
      {action: 'deleteHost', liClass:'', cssClass: 'icon-remove', 'label': this.t('hosts.host.details.deleteHost')},
      {action: 'onOffPassiveModeForHost', liClass:'', cssClass: 'icon-medkit', active:this.get('isActive'), 'label': this.t('passiveState.turn' + onOff)}];
  }.property('controller.content','isActive', 'controller.content.isNotHeartBeating'),
  didInsertElement: function() {
    App.tooltip($("[rel='HealthTooltip']"));
  }
});
