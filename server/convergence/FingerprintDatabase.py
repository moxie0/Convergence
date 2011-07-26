from twisted.internet import defer
import time

class FingerprintDatabase:

    def __init__(self, connection):
        self.connection = connection

    def _getLocation(self, host, port):
        return host+":"+str(port)

    def _updateRecords(self, transaction, host, port, fingerprint):
        location = self._getLocation(host, port)
        params   = (location,fingerprint)
        transaction.execute("SELECT id, fingerprint, timestamp_start, timestamp_finish " \
                            "FROM fingerprints WHERE location = ? AND fingerprint = ?" \
                            "ORDER BY timestamp_finish DESC LIMIT 1", params)

        row = transaction.fetchone()

        if row is None or row[1] != fingerprint:
            params = (location, fingerprint, str(int(time.time())), str(int(time.time())))
            transaction.execute("INSERT INTO fingerprints (location, fingerprint, timestamp_start, timestamp_finish) " \
                                "VALUES (?, ?, ?, ?)", params)
        else:
            params = (str(int(time.time())), row[0])
            transaction.execute("UPDATE fingerprints SET timestamp_finish = ? WHERE id = ?", params)

        params = (location,)
        transaction.execute("SELECT fingerprint, timestamp_start, timestamp_finish " \
                            "FROM fingerprints WHERE location = ?" \
                            "ORDER BY timestamp_finish DESC", params)

        return transaction.fetchall()        

    def updateRecordsFor(self, host, port, fingerprint):
        return self.connection.runInteraction(self._updateRecords, host, port, fingerprint)

    def getRecordsFor(self, host, port):
        params = (self._getLocation(host, port),)
        return self.connection.runQuery("SELECT fingerprint, timestamp_start, timestamp_finish " \
                                        "FROM fingerprints WHERE location = ? " \
                                        "ORDER BY timestamp_finish DESC", params);
