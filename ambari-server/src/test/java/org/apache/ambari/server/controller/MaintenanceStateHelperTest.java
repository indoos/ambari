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
package org.apache.ambari.server.controller;

import static org.easymock.EasyMock.capture;
import static org.easymock.EasyMock.createMock;
import static org.easymock.EasyMock.expect;
import static org.easymock.EasyMock.replay;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.ambari.server.state.Cluster;
import org.apache.ambari.server.state.Clusters;
import org.apache.ambari.server.state.Host;
import org.apache.ambari.server.state.MaintenanceState;
import org.apache.ambari.server.state.Service;
import org.apache.ambari.server.state.ServiceComponent;
import org.apache.ambari.server.state.ServiceComponentHost;
import org.easymock.Capture;
import org.junit.Assert;
import org.junit.Test;

/**
 * Tests the {@link MaintenanceStateHelper} class
 */
public class MaintenanceStateHelperTest {

  @Test
  public void testService() throws Exception {
    testService(MaintenanceState.ON);
    testService(MaintenanceState.OFF);
  }
  
  @Test
  public void testHost() throws Exception {
    testHost(MaintenanceState.ON);
    testHost(MaintenanceState.OFF);
  }
  
  @Test
  public void testHostComponent() throws Exception {
    testHostComponent(MaintenanceState.ON);
    testHostComponent(MaintenanceState.OFF);
  }
  
  private void testHostComponent(MaintenanceState state) throws Exception {
    AmbariManagementController amc = createMock(AmbariManagementController.class);
    Capture<ExecuteActionRequest> earCapture = new Capture<ExecuteActionRequest>();
    Capture<Map<String, String>> rpCapture = new Capture<Map<String, String>>();
    expect(amc.createAction(capture(earCapture), capture(rpCapture))).andReturn(null);
    
    Clusters clusters = createMock(Clusters.class);
    Cluster cluster = createMock(Cluster.class);
    expect(amc.getClusters()).andReturn(clusters).anyTimes();
    expect(clusters.getClusterById(1L)).andReturn(cluster);
    expect(cluster.getClusterName()).andReturn("c1").anyTimes();
    
    ServiceComponentHost sch = createMock(ServiceComponentHost.class);
    expect(sch.getClusterName()).andReturn("c1");
    expect(sch.getClusterId()).andReturn(1L);
    expect(sch.getMaintenanceState()).andReturn(state);
    expect(sch.getServiceName()).andReturn("HDFS");
    expect(sch.getServiceComponentName()).andReturn("NAMENODE").anyTimes();
    expect(sch.getHostName()).andReturn("h1");
    
    replay(amc, clusters, cluster, sch);
    
    Map<String, String> map = new HashMap<String, String>();
    map.put("context", "abc");
    MaintenanceStateHelper.createRequests(amc, map,
        Collections.singleton(sch.getClusterName()));
    
    ExecuteActionRequest ear = earCapture.getValue();
    map = rpCapture.getValue();
    
    Assert.assertEquals("nagios_update_ignore", ear.getActionName());
    Assert.assertEquals("ACTIONEXECUTE", ear.getCommandName());
    Assert.assertEquals("NAGIOS", ear.getServiceName());
    Assert.assertEquals("NAGIOS_SERVER", ear.getComponentName());
    Assert.assertEquals("c1", ear.getClusterName());
    Assert.assertTrue(map.containsKey("context"));  
  }
  
  private void testHost(MaintenanceState state) throws Exception {
    AmbariManagementController amc = createMock(AmbariManagementController.class);
    Capture<ExecuteActionRequest> earCapture = new Capture<ExecuteActionRequest>();
    Capture<Map<String, String>> rpCapture = new Capture<Map<String, String>>();
    expect(amc.createAction(capture(earCapture), capture(rpCapture))).andReturn(null);

    Clusters clusters = createMock(Clusters.class);
    Cluster cluster = createMock(Cluster.class);
    Service service = createMock(Service.class);
    
    ServiceComponent sc1 = createMock(ServiceComponent.class);
    ServiceComponent sc2 = createMock(ServiceComponent.class);
    expect(sc1.isClientComponent()).andReturn(Boolean.FALSE).anyTimes();
    expect(sc2.isClientComponent()).andReturn(Boolean.TRUE).anyTimes();

    ServiceComponentHost sch1 = createMock(ServiceComponentHost.class);
    Map<String, ServiceComponentHost> schMap = new HashMap<String, ServiceComponentHost>();
    schMap.put("h1", sch1);
    expect(sch1.getHostName()).andReturn("h1");
    expect(sch1.getServiceName()).andReturn("HDFS").anyTimes();
    expect(sch1.getServiceComponentName()).andReturn("NAMENODE").anyTimes();
    
    List<ServiceComponentHost> schList = new ArrayList<ServiceComponentHost>(schMap.values());
    
    expect(amc.getClusters()).andReturn(clusters).anyTimes();
    expect(clusters.getClusterById(1L)).andReturn(cluster);
    expect(cluster.getClusterName()).andReturn("c1").anyTimes();
    expect(cluster.getService("HDFS")).andReturn(service).anyTimes();
    expect(cluster.getClusterId()).andReturn(Long.valueOf(1L));
    expect(cluster.getServiceComponentHosts("h1")).andReturn(schList);
    expect(service.getServiceComponent("NAMENODE")).andReturn(sc1);
    
    Host host = createMock(Host.class);
    expect(host.getHostName()).andReturn("h1").anyTimes();
    expect(host.getMaintenanceState(1L)).andReturn(state);
    
    replay(amc, clusters, cluster, service, sch1, host);
    
    Map<String, String> map = new HashMap<String, String>();
    map.put("context", "abc");
    MaintenanceStateHelper.createRequests(amc, map,
        Collections.singleton(cluster.getClusterName()));
    
    ExecuteActionRequest ear = earCapture.getValue();
    rpCapture.getValue();
    
    Assert.assertEquals("nagios_update_ignore", ear.getActionName());
    Assert.assertEquals("ACTIONEXECUTE", ear.getCommandName());
    Assert.assertEquals("NAGIOS", ear.getServiceName());
    Assert.assertEquals("NAGIOS_SERVER", ear.getComponentName());
    Assert.assertEquals("c1", ear.getClusterName());
    Assert.assertTrue(map.containsKey("context"));    
  }
  
  
  private void testService(MaintenanceState state) throws Exception {
    AmbariManagementController amc = createMock(AmbariManagementController.class);
    Capture<ExecuteActionRequest> earCapture = new Capture<ExecuteActionRequest>();
    Capture<Map<String, String>> rpCapture = new Capture<Map<String, String>>();
    expect(amc.createAction(capture(earCapture), capture(rpCapture))).andReturn(null);
    
    Clusters clusters = createMock(Clusters.class);
    Cluster cluster = createMock(Cluster.class);
    Service service = createMock(Service.class);
    
    ServiceComponent sc1 = createMock(ServiceComponent.class);
    ServiceComponent sc2 = createMock(ServiceComponent.class);
    expect(sc1.isClientComponent()).andReturn(Boolean.FALSE).anyTimes();
    expect(sc2.isClientComponent()).andReturn(Boolean.TRUE).anyTimes();
    
    ServiceComponentHost sch1 = createMock(ServiceComponentHost.class);
    Map<String, ServiceComponentHost> schMap = new HashMap<String, ServiceComponentHost>();
    schMap.put("h1", sch1);
    expect(sch1.getHostName()).andReturn("h1");
    expect(sch1.getServiceName()).andReturn("HDFS");
    expect(sch1.getServiceComponentName()).andReturn("NAMENODE");
    
    expect(sc1.getServiceComponentHosts()).andReturn(schMap);
    
    Map<String, ServiceComponent> scMap = new HashMap<String, ServiceComponent>();
    scMap.put("NAMENODE", sc1);
    scMap.put("HDFS_CLIENT", sc2);
    
    expect(amc.getClusters()).andReturn(clusters).anyTimes();
    expect(clusters.getClusterById(1L)).andReturn(cluster);
    expect(cluster.getClusterName()).andReturn("c1");
    expect(cluster.getClusterId()).andReturn(1L);
    expect(service.getCluster()).andReturn(cluster);
    expect(service.getServiceComponents()).andReturn(scMap);
    expect(service.getMaintenanceState()).andReturn(state);
    expect(service.getName()).andReturn("HDFS");
    
    replay(amc, clusters, cluster, service, sc1, sc2, sch1);
    
    Map<String, String> map = new HashMap<String, String>();
    map.put("context", "abc");
    MaintenanceStateHelper.createRequests(amc, map,
        Collections.singleton("c1"));
    
    ExecuteActionRequest ear = earCapture.getValue();
    map = rpCapture.getValue();
    
    Assert.assertEquals("nagios_update_ignore", ear.getActionName());
    Assert.assertEquals("ACTIONEXECUTE", ear.getCommandName());
    Assert.assertEquals("NAGIOS", ear.getServiceName());
    Assert.assertEquals("NAGIOS_SERVER", ear.getComponentName());
    Assert.assertEquals("c1", ear.getClusterName());
    Assert.assertTrue(map.containsKey("context"));
  }
  
}
