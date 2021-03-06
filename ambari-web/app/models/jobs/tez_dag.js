/**
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with this
 * work for additional information regarding copyright ownership. The ASF
 * licenses this file to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

var App = require('app');
var dateUtils = require('utils/date');
var numberUtils = require('utils/number_utils');

App.TezDag = DS.Model.extend({
  id : DS.attr('string'),
  /**
   * When DAG is actually running on server, a unique ID is assigned.
   */
  instanceId : DS.attr('string'),
  name : DS.attr('string'),
  stage : DS.attr('string'),
  vertices : DS.hasMany('App.TezDagVertex'),
  edges : DS.hasMany('App.TezDagEdge')
});

App.TezDagEdge = DS.Model.extend({
  id : DS.attr('string'),
  instanceId : DS.attr('string'),
  fromVertex : DS.belongsTo('App.TezDagVertex'),
  toVertex : DS.belongsTo('App.TezDagVertex'),
  /**
   * Type of this edge connecting vertices. Should be one of constants defined
   * in 'App.TezDagVertexType'.
   */
  edgeType : DS.attr('string')
});

App.TezDagVertex = DS.Model.extend({
  id : DS.attr('string'),
  /**
   * When DAG vertex is actually running on server, a unique ID is assigned.
   */
  instanceId : DS.attr('string'),
  name : DS.attr('string'),

  /**
   * State of this vertex. Should be one of constants defined in
   * App.TezDagVertexState.
   */
  state : DS.attr('string'),

  /**
   * @return {Boolean} Whether this vertex is a Map or Reduce operation.
   */
  isMap : DS.attr('boolean'),

  /**
   * A vertex can have multiple incoming edges.
   */
  incomingEdges : DS.hasMany('App.TezDagEdge'),

  /**
   * This vertex can have multiple outgoing edges.
   */
  outgoingEdges : DS.hasMany('App.TezDagEdge'),

  startTime : DS.attr('number'),
  endTime : DS.attr('number'),

  /**
   * Provides the duration of this job. If the job has not started, duration
   * will be given as 0. If the job has not ended, duration will be till now.
   *
   * @return {Number} Duration in milliseconds.
   */
  duration : function() {
    return dateUtils.duration(this.get('startTime'), this.get('endTime'))
  }.property('startTime', 'endTime'),

  /**
   * Each Tez vertex can perform arbitrary application specific computations
   * inside. The application can provide a list of operations it has provided in
   * this vertex.
   *
   * Array of strings. [{string}]
   */
  operations : DS.attr('array'),

  /**
   * Provides additional information about the 'operations' performed in this
   * vertex. This is shown directly to the user.
   */
  operationPlan : DS.attr('string'),

  /**
   * Number of actual Map/Reduce tasks in this vertex
   */
  tasksCount : DS.attr('number'),

  /**
   * Local filesystem usage metrics for this vertex
   */
  fileReadBytes : DS.attr('number'),
  fileWriteBytes : DS.attr('number'),
  fileReadOps : DS.attr('number'),
  fileWriteOps : DS.attr('number'),

  /**
   * HDFS usage metrics for this vertex
   */
  hdfsReadBytes : DS.attr('number'),
  hdfsWriteBytes : DS.attr('number'),
  hdfsReadOps : DS.attr('number'),
  hdfsWriteOps : DS.attr('number'),

  /**
   * Record metrics for this vertex
   */
  recordReadCount : DS.attr('number'),
  recordWriteCount : DS.attr('number'),

  totalReadBytesDisplay : function() {
    return numberUtils.bytesToSize(this.get('fileReadBytes') + this.get('hdfsReadBytes'));
  }.property('fileReadBytes', 'hdfsReadBytes'),

  totalWriteBytesDisplay : function() {
    return numberUtils.bytesToSize(this.get('fileWriteBytes') + this.get('hdfsWriteBytes'));
  }.property('fileWriteBytes', 'hdfsWriteBytes'),

  durationDisplay : function() {
    var duration = this.get('duration');
    return dateUtils.timingFormat(duration, true);
  }.property('duration')
});

App.TezDagVertexState = {
  NEW : "NEW",
  INITIALIZING : "INITIALIZING",
  INITED : "INITED",
  RUNNING : "RUNNING",
  SUCCEEDED : "SUCCEEDED",
  FAILED : "FAILED",
  KILLED : "KILLED",
  ERROR : "ERROR",
  TERMINATING : "TERMINATING"
};

App.TezDagVertexType = {
  SCATTER_GATHER : "SCATTER_GATHER",
  BROADCAST : "BROADCAST"
};

App.TezDag.FIXTURES = [];
App.TezDagEdge.FIXTURES = [];
App.TezDagVertex.FIXTURES = [];