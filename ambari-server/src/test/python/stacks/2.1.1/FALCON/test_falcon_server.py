#!/usr/bin/env python

'''
Licensed to the Apache Software Foundation (ASF) under one
or more contributor license agreements.  See the NOTICE file
distributed with this work for additional information
regarding copyright ownership.  The ASF licenses this file
to you under the Apache License, Version 2.0 (the
"License"); you may not use this file except in compliance
with the License.  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
'''

from stacks.utils.RMFTestCase import *


class TestFalconServer(RMFTestCase):

  def test_start_default(self):
    self.executeScript("2.1.1/services/FALCON/package/scripts/falcon_server.py",
                       classname="FalconServer",
                       command="start",
                       config_file="default.json"
    )
    self.assert_configure_default()
    self.assertResourceCalled('Directory', '/var/run/falcon',
                              owner = 'falcon',
                              )
    self.assertResourceCalled('Directory', '/var/log/falcon',
                              owner = 'falcon',
                              )
    self.assertResourceCalled('Directory', '/var/lib/falcon/webapp',
                              owner = 'falcon',
                              )
    self.assertResourceCalled('Execute',
                              'env JAVA_HOME=/usr/jdk64/jdk1.7.0_45 FALCON_LOG_DIR=/var/log/falcon FALCON_PID_DIR=/var/run/falcon FALCON_DATA_DIR=/hadoop/falcon/activemq /usr/lib/falcon/bin/falcon-start -port 15000',
                              user='falcon', )
    self.assertNoMoreResources()

  def test_stop_default(self):
    self.executeScript("2.1.1/services/FALCON/package/scripts/falcon_server.py",
                       classname="FalconServer",
                       command="stop",
                       config_file="default.json"
    )
    self.assertResourceCalled('Directory', '/var/run/falcon',
                              owner = 'falcon',
                              )
    self.assertResourceCalled('Directory', '/var/log/falcon',
                              owner = 'falcon',
                              )
    self.assertResourceCalled('Directory', '/var/lib/falcon/webapp',
                              owner = 'falcon',
                              )
    self.assertResourceCalled('Execute',
                          'env JAVA_HOME=/usr/jdk64/jdk1.7.0_45 FALCON_LOG_DIR=/var/log/falcon FALCON_PID_DIR=/var/run/falcon FALCON_DATA_DIR=/hadoop/falcon/activemq /usr/lib/falcon/bin/falcon-stop',
                          user='falcon', )
    self.assertResourceCalled('File',
                              '/var/run/falcon/falcon.pid',
                              action=['delete'])
    self.assertNoMoreResources()

  def test_configure_default(self):
    self.executeScript("2.1.1/services/FALCON/package/scripts/falcon_server.py",
                       classname="FalconServer",
                       command="configure",
                       config_file="default.json"
    )
    self.assert_configure_default()
    self.assertNoMoreResources()

  def assert_configure_default(self):
    self.assertResourceCalled('Directory', '/var/run/falcon',
                              owner = 'falcon',
                              )
    self.assertResourceCalled('Directory', '/var/log/falcon',
                              owner = 'falcon',
                              )
    self.assertResourceCalled('Directory', '/var/lib/falcon/webapp',
                              owner = 'falcon',
                              )
    self.assertResourceCalled('HdfsDirectory', '/apps/falcon',
                              action=['create_delayed'],
                              conf_dir='/etc/hadoop/conf',
                              hdfs_user='hdfs',
                              keytab=UnknownConfigurationMock(),
                              kinit_path_local='/usr/bin/kinit',
                              mode=0777,
                              owner='falcon',
                              security_enabled=False
                              )
    self.assertResourceCalled('HdfsDirectory', None,
                              action=['create'],
                              conf_dir='/etc/hadoop/conf',
                              hdfs_user='hdfs',
                              keytab=UnknownConfigurationMock(),
                              kinit_path_local='/usr/bin/kinit',
                              security_enabled=False
                              )
    self.assertResourceCalled('Directory', '/hadoop/falcon',
                              owner = 'falcon',
                              recursive = True
                              )
    self.assertResourceCalled('Directory', '/hadoop/falcon/activemq',
                              owner = 'falcon',
                              recursive = True,
                              )
    self.assertResourceCalled('PropertiesFile', '/etc/falcon/conf/runtime.properties',
                              mode = 0644,
                              properties = self.getConfig()['configurations']['falcon-runtime.properties'],
                              )
    self.assertResourceCalled('PropertiesFile', '/etc/falcon/conf/startup.properties',
                              mode = 0644,
                              properties = self.getConfig()['configurations']['falcon-startup.properties'],
                              )


