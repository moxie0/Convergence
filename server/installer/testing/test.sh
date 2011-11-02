
base=/home/hmco/work/devel/Convergence/server

function clear_dst()
{
	rm -rf /etc/convergence
	rm -f /var/lib/convergence/convergence.db \
		/etc/sysconfig/convergence \
		/etc/rc.d/init.d/convergence
}

function clear_staging()
{
	local name=$1
	rm -rf $base/$name
}
