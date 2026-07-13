import { Injectable, inject } from '@angular/core';
import { AuthResponse, Nodo, Producto, BuyGroup, GroupOrder, Categoria, UserCard, AppError } from './core/models/auth.models';
import { AuthService } from './core/services/auth.service';
import { NodeService } from './core/services/node.service';
import { ProductService } from './core/services/product.service';
import { BuyGroupService } from './core/services/buy-group.service';
import { StatsService } from './core/services/stats.service';

@Injectable({
  providedIn: 'root',
})
export class AppFacadeService {
  private authService = inject(AuthService);
  private nodeService = inject(NodeService);
  private productService = inject(ProductService);
  private buyGroupService = inject(BuyGroupService);
  private statsService = inject(StatsService);

  // Reenvío de estados de AuthService para compatibilidad
  public currentUser$ = this.authService.currentUser$;
  public currentUser = this.authService.currentUser;
  public userRole = this.authService.userRole;
  public authInitialized$ = this.authService.authInitialized$;
  public authInitialized = this.authService.authInitialized;

  public get currentUserValue() {
    return this.authService.currentUserValue;
  }

  // Delegación de Auth y Perfiles
  register(email: string, password: string, firstName: string, lastName: string) {
    return this.authService.register(email, password, firstName, lastName);
  }

  login(email: string, password: string) {
    return this.authService.login(email, password);
  }

  getUserProfile(userId: string) {
    return this.authService.getUserProfile(userId);
  }

  updateProfile(dto: { first_name?: string; last_name?: string; default_node_id?: string }) {
    return this.authService.updateProfile(dto);
  }

  logout() {
    return this.authService.logout();
  }

  getSession() {
    return this.authService.getSession();
  }

  verifyOtp(email: string, token: string) {
    return this.authService.verifyOtp(email, token);
  }

  // Delegación de Nodos
  getNodos() {
    return this.nodeService.getNodos();
  }

  createNodo(nodo: Nodo) {
    return this.nodeService.createNodo(nodo);
  }

  updateNodo(id: string, nodo: Partial<Nodo>) {
    return this.nodeService.updateNodo(id, nodo);
  }

  deleteNodo(id: string) {
    return this.nodeService.deleteNodo(id);
  }

  // Delegación de Productos
  getProductos(filters?: { search?: string; categoryId?: string; page?: number; limit?: number }) {
    return this.productService.getProductos(filters);
  }

  getCategorias() {
    return this.productService.getCategorias();
  }

  createProducto(producto: Producto) {
    return this.productService.createProducto(producto);
  }

  updateProducto(id: string, producto: Partial<Producto>) {
    return this.productService.updateProducto(id, producto);
  }

  deleteProducto(id: string) {
    return this.productService.deleteProducto(id);
  }

  // Delegación de Compras Colectivas y Pedidos
  getActiveBuyGroups(nodeId: string) {
    return this.buyGroupService.getActiveBuyGroups(nodeId);
  }

  joinOrCreateBuyGroup(dto: {
    productId: string;
    quantity: number;
    nodeId: string;
    paymentToken: string;
    paymentMethodId: string;
    cardholderEmail: string;
  }) {
    return this.buyGroupService.joinOrCreateBuyGroup(dto);
  }

  getMyOrders() {
    return this.buyGroupService.getMyOrders();
  }

  listBuyGroups(filters?: { status?: string; nodeId?: string; productId?: string }) {
    return this.buyGroupService.listBuyGroups(filters);
  }

  updateBuyGroupStatus(id: string, status: string) {
    return this.buyGroupService.updateBuyGroupStatus(id, status);
  }

  consolidateBuyGroups(dto: { nodeId: string; groupIds?: string[] }) {
    return this.buyGroupService.consolidateBuyGroups(dto);
  }

  // Delegación de Tarjetas Guardadas
  listSavedCards() {
    return this.authService.listSavedCards();
  }

  addSavedCard(cardToken: string) {
    return this.authService.addSavedCard(cardToken);
  }

  deleteSavedCard(cardId: string) {
    return this.authService.deleteSavedCard(cardId);
  }

  // Delegación de Estadísticas
  getNodeDashboardStats(nodeId: string) {
    return this.statsService.getNodeDashboardStats(nodeId);
  }

  getAdminDashboardStats() {
    return this.statsService.getAdminDashboardStats();
  }
}
