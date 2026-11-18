<!--=== Page Header ===-->
<div class="page-header">
  <div class="page-title">
    <h3>{$app->controller->view->headingTitle}</h3>
  </div>
  <div class="page-actions">
    <a class="btn btn-primary" href="{$app->urlManager->createUrl('seller-applications/products')}">
      Produk Seller
      {if $pendingProducts > 0}
        <span class="badge">{$pendingProducts}</span>
      {/if}
    </a>
  </div>
</div>
<!-- /Page Header -->

<div class="order-wrap">
  <div class="row order-box-list">
    <div class="col-md-12">
      <div class="widget-content">
        {if $applications|@count == 0}
          <div class="alert alert-info">Belum ada pengajuan toko.</div>
        {else}
          <table class="table table-striped table-bordered table-hover table-responsive">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tanggal</th>
                <th>Nama Toko</th>
                <th>Kategori</th>
                <th>Penanggung Jawab</th>
                <th>Kontak</th>
                <th>Alamat</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {foreach $applications as $application}
                <tr>
                  <td>{$application.applications_id|escape:'html'}</td>
                  <td>{$application.date_added|escape:'html'}</td>
                  <td>
                    <strong>{$application.store_name|escape:'html'}</strong>
                    {if $application.description}
                      <div class="text-muted small">{$application.description|escape:'html'|truncate:120}</div>
                    {/if}
                  </td>
                  <td>{$application.category|escape:'html'}</td>
                  <td>{$application.contact_name|escape:'html'}</td>
                  <td>
                    <div>{$application.contact_phone|escape:'html'}</div>
                    {if $application.contact_email}
                      <div class="text-muted small">{$application.contact_email|escape:'html'}</div>
                    {/if}
                  </td>
                  <td>
                    {$application.street_address|escape:'html'}{if $application.city}, {$application.city|escape:'html'}{/if}{if $application.postcode} {$application.postcode|escape:'html'}{/if}
                  </td>
                  <td>
                    {if $application.status == 0}
                      <span class="label label-warning">{$statusLabels[0]|escape:'html'}</span>
                    {elseif $application.status == 1}
                      <span class="label label-success">{$statusLabels[1]|escape:'html'}</span>
                    {else}
                      <span class="label label-danger">{$statusLabels[2]|escape:'html'}</span>
                    {/if}
                  </td>
                  <td>
                    {if $application.status != 1}
                      <button type="button" class="btn btn-success btn-xs" onclick="return setSellerApplicationStatus({$application.applications_id}, 1);">
                        Setujui
                      </button>
                    {elseif !isset($stores[$application.applications_id])}
                      <button type="button" class="btn btn-success btn-xs" onclick="return setSellerApplicationStatus({$application.applications_id}, 1);">
                        Aktifkan Toko
                      </button>
                    {/if}
                    {if $application.status != 2}
                      <button type="button" class="btn btn-danger btn-xs" onclick="return setSellerApplicationStatus({$application.applications_id}, 2);">
                        Tolak
                      </button>
                    {/if}
                    {if $application.status != 0}
                      <button type="button" class="btn btn-default btn-xs" onclick="return setSellerApplicationStatus({$application.applications_id}, 0);">
                        Kembalikan
                      </button>
                    {/if}
                  </td>
                </tr>
              {/foreach}
            </tbody>
          </table>
        {/if}
      </div>
    </div>
  </div>
</div>

<script type="text/javascript">
  function setSellerApplicationStatus(applicationsId, status) {
    $.post(
      "{$app->urlManager->createUrl('seller-applications/set-status')}",
      { applications_id: applicationsId, status: status },
      function () {
        window.location.reload();
      }
    );

    return false;
  }
</script>
