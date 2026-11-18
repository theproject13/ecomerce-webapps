<div class="page-header">
  <div class="page-title">
    <h3>{$app->controller->view->headingTitle}</h3>
  </div>
  <div class="page-actions">
    <a class="btn btn-default" href="{$app->urlManager->createUrl('seller-applications/index')}">
      Kembali ke Pengajuan
    </a>
  </div>
</div>

<div class="order-wrap">
  <div class="row order-box-list">
    <div class="col-md-12">
      <div class="widget-content">
        {if $products|@count == 0}
          <div class="alert alert-info">Belum ada produk seller.</div>
        {else}
          <table class="table table-striped table-bordered table-hover table-responsive">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tanggal</th>
                <th>Toko</th>
                <th>Produk</th>
                <th>Harga</th>
                <th>Stok</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {foreach $products as $product}
                <tr>
                  <td>{$product.products_id|escape:'html'}</td>
                  <td>{$product.date_added|escape:'html'}</td>
                  <td>{$product.store_name|escape:'html'}</td>
                  <td>
                    <strong>{$product.products_name|default:"Tanpa nama"|escape:'html'}</strong>
                    {if $product.reject_reason}
                      <div class="text-danger small">Alasan: {$product.reject_reason|escape:'html'}</div>
                    {/if}
                  </td>
                  <td>{$product.price_display|escape:'html'}</td>
                  <td>{$product.products_quantity|escape:'html'}</td>
                  <td>
                    {if $product.status == 0}
                      <span class="label label-warning">{$statusLabels[0]|escape:'html'}</span>
                    {elseif $product.status == 1}
                      <span class="label label-success">{$statusLabels[1]|escape:'html'}</span>
                    {else}
                      <span class="label label-danger">{$statusLabels[2]|escape:'html'}</span>
                    {/if}
                  </td>
                  <td>
                    {if $product.status != 1}
                      <button type="button" class="btn btn-success btn-xs" onclick="return setSellerProductStatus({$product.seller_products_id}, 1);">
                        Setujui
                      </button>
                    {/if}
                    {if $product.status != 2}
                      <button type="button" class="btn btn-danger btn-xs" onclick="return setSellerProductStatus({$product.seller_products_id}, 2);">
                        Tolak
                      </button>
                    {/if}
                    {if $product.status != 0}
                      <button type="button" class="btn btn-default btn-xs" onclick="return setSellerProductStatus({$product.seller_products_id}, 0);">
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
  function setSellerProductStatus(sellerProductsId, status) {
    $.post(
      "{$app->urlManager->createUrl('seller-applications/set-product-status')}",
      { seller_products_id: sellerProductsId, status: status },
      function () {
        window.location.reload();
      }
    );

    return false;
  }
</script>
