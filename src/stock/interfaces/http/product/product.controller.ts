import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  DeleteProductUseCase,
  GetAllProductUseCase,
  GetProductUseCase,
  UpdateProductUseCase,
} from '../../../application/use-case/product';
import { CreateProductUseCase } from '../../../application/use-case/product/create-product';
import { UserRole } from '../../../domain/entities/user-role';
import { AuthRoles } from '../auth/decorators/auth-roles.decorator';
import { CreateProductDto } from './dtos/create-product-request.dto';
import { ProductResponseDto } from './dtos/product-response.dto';
import { UpdateProductDto } from './dtos/update-product-request.dto';

@ApiTags('Estoque / Produtos')
@ApiBearerAuth()
@Controller('product')
export class ProductController {
  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly getProductUseCase: GetProductUseCase,
    private readonly getAllProductUseCase: GetAllProductUseCase,
    private readonly updateProductUseCase: UpdateProductUseCase,
    private readonly deleteProductUseCase: DeleteProductUseCase,
  ) {}

  @Post()
  @AuthRoles(UserRole.ADMIN, UserRole.ESTOQUISTA)
  @ApiOperation({ summary: 'Criar produto' })
  @ApiOkResponse({ type: ProductResponseDto })
  async create(@Body() dto: CreateProductDto): Promise<ProductResponseDto> {
    const product = await this.createProductUseCase.execute({
      code: dto.code,
      name: dto.name,
      description: dto.description,
    });
    return ProductResponseDto.toDto(product);
  }

  @Get()
  @AuthRoles(UserRole.ADMIN, UserRole.ESTOQUISTA, UserRole.MECANICO)
  @ApiOperation({ summary: 'Listar produtos' })
  @ApiOkResponse({ type: [ProductResponseDto] })
  async findAll(): Promise<ProductResponseDto[]> {
    const list = await this.getAllProductUseCase.execute();
    return list.map((p) => ProductResponseDto.toDto(p));
  }

  @Get(':code')
  @AuthRoles(UserRole.ADMIN, UserRole.ESTOQUISTA, UserRole.MECANICO)
  @ApiOperation({ summary: 'Buscar produto por código' })
  @ApiOkResponse({ type: ProductResponseDto })
  async findOne(@Param('code') code: string): Promise<ProductResponseDto> {
    const product = await this.getProductUseCase.execute(code);
    return ProductResponseDto.toDto(product);
  }

  @Patch(':code')
  @AuthRoles(UserRole.ADMIN, UserRole.ESTOQUISTA)
  @ApiOperation({ summary: 'Atualizar produto' })
  @ApiOkResponse({ type: ProductResponseDto })
  async update(
    @Param('code') code: string,
    @Body() data: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    const product = await this.updateProductUseCase.execute(code, {
      name: data.name,
      description: data.description,
    });
    return ProductResponseDto.toDto(product);
  }

  @Delete(':code')
  @AuthRoles(UserRole.ADMIN, UserRole.ESTOQUISTA)
  remove(@Param('code') code: string) {
    return this.deleteProductUseCase.execute(code);
  }
}
