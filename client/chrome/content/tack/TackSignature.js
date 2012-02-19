
function TackSignature(secItem) {
  const SIG_TYPE_LENGTH       = 1;
  const SIG_EXPIRATION_LENGTH = 4;
  const SIG_GENERATION_LENGTH = 1;
  const SIG_TARGET_LENGTH     = 32;
  const SIGNATURE_LENGTH      = 64;

  const TACK_SIG_LENGTH   = SIG_TYPE_LENGTH + SIG_EXPIRATION_LENGTH   + 
                            SIG_GENERATION_LENGTH + SIG_TARGET_LENGTH + 
                            SIGNATURE_LENGTH;

  const SIG_TYPE_OFFSET       = 73;
  const SIG_EXPIRATION_OFFSET = SIG_TYPE_OFFSET + SIG_TYPE_LENGTH; 
  const SIG_GENERATION_OFFSET = SIG_EXPIRATION_OFFSET + SIG_EXPIRATION_LENGTH;
  const SIG_TARGET_OFFSET     = SIG_GENERATION_OFFSET + SIG_GENERATION_LENGTH;
  const SIGNATURE_OFFSET      = SIG_TARGET_OFFSET     + SIG_TARGET_LENGTH;

  if (secItem.len < TACK_SIG_LENGTH + SIG_TYPE_OFFSET)
    return null;

  var data = secItem.data;

  this.type       = data[SIG_TYPE_OFFSET];
  this.expiration =  
    ((data[SIG_EXPIRATION_OFFSET]   & 0xFF) << 24) |
    ((data[SIG_EXPIRATION_OFFSET+1] & 0xFF) << 16) |
    ((data[SIG_EXPIRATION_OFFSET+2] & 0xFF) << 8)  |
    ((data[SIG_EXPIRATION_OFFSET+3] & 0xFF));

  this.generation    = data[SIG_GENERATION_OFFSET];
  this.target_sha256 = NSS.lib.ubuffer(SIG_TARGET_LENGTH);
  this.signature     = NSS.lib.ubuffer(SIGNATURE_LENGTH);

  for (var i=0;i<SIG_TARGET_LENGTH;i++)
    this.target_sha256[i] = data[SIG_TARGET_OFFSET + i];
  
  for (var i=0;i<SIGNATURE_LENGTH;i++)
    this.signature[i] = data[SIGNATURE_OFFSET + i];

}