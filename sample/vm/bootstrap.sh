#!/bin/bash

#add repository for oracle java
add-apt-repository --yes ppa:webupd8team/java

#queue up some answers for mysql stuff
echo 'mysql-server mysql-server/root_password password password' | debconf-set-selections
echo 'mysql-server mysql-server/root_password_again password password' | debconf-set-selections

#queue up some answers for java stuff
echo debconf shared/accepted-oracle-license-v1-1 select true | debconf-set-selections
echo debconf shared/accepted-oracle-license-v1-1 seen true | debconf-set-selections

apt-get update
apt-get install -y mysql-server-5.6 mysql-client-5.6 build-essential oracle-java7-installer oracle-java7-set-default

#Download, install and configure redis
if [ ! -f /var/log/redissetup ];
then
    #modify redis config
    wget http://download.redis.io/redis-stable.tar.gz
    tar xzf redis-stable.tar.gz
    cd redis-stable
    make
    cp src/redis-server /usr/local/bin
    cp src/redis-cli /usr/local/bin
    mkdir /etc/redis
    mkdir /var/redis
    cp utils/redis_init_script /etc/init.d/redis_6379
    cp /vagrant/data/redis/redis.conf /etc/redis/6379.conf
    mkdir /var/redis/6379
    cd -
    update-rc.d redis_6379 defaults
    service redis_6379 start
    touch /var/log/redissetup
fi

#Configure mysql with dev and test db
if [ ! -f /var/log/mysqlsetup ];
then
    if [ -f /vagrant/data/mysql/init.sql ];
    then
        echo "CREATE USER 'ravel'@'%' IDENTIFIED BY 'password'" | mysql -uroot -ppassword
        echo "CREATE DATABASE ravel_schema" | mysql -uroot -ppassword
        echo "CREATE DATABASE ravel_test_schema" | mysql -uroot -ppassword
        echo "GRANT ALL ON ravel_schema.* TO 'ravel'@'%'" | mysql -uroot -ppassword
        echo "GRANT ALL ON ravel_test_schema.* TO 'ravel'@'%'" | mysql -uroot -ppassword
        echo "FLUSH PRIVILEGES" | mysql -uroot -ppassword
        sed 's/ravel_schema/ravel_test_schema/g' /vagrant/data/mysql/init.sql > /vagrant/data/mysql/init_test.sql
        mysql -uroot -ppassword ravel_schema < /vagrant/data/mysql/init.sql
        mysql -uroot -ppassword ravel_test_schema < /vagrant/data/mysql/init_test.sql
    fi
    #make bind-address 0.0.0.0 so that it binds to all available interfaces
    sed -i 's/bind-address.*/bind-address=0.0.0.0/g' /etc/mysql/my.cnf
    service mysql restart
fi


#auto-update time
if [ ! -f /var/log/cronsetup ];
then
    line="*/10 * * * * ntpdate ntp.ubuntu.com"
    (crontab -l; echo "$line" ) | crontab  -
fi